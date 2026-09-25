-- Private records are never exposed through the Data API.
create schema if not exists optativa_private;
revoke all on schema optativa_private from public, anon, authenticated;
create table if not exists optativa_private.documents (
 collection text not null, id text not null, data jsonb not null,
 version bigint not null default 1,
 primary key(collection,id),
 constraint capacity_bounds check (
  collection <> 'groups' or (
   data ?& array['inscritos','cupoMaximo'] and jsonb_typeof(data->'inscritos')='number' and
   (data->>'inscritos')::integer between 0 and 25 and
   (data->>'cupoMaximo')::integer=25
  )
 ),
 constraint enrollment_identity check(collection<>'enrollments' or coalesce(data->>'studentId'=id,false))
);
create index if not exists optativa_student_search on optativa_private.documents
 ((data->>'seccion'),(data->>'nivel'),(data->>'nombreNormalizado') text_pattern_ops)
 where collection='students';
create table if not exists optativa_private.commit_guard(id integer primary key check(id=1));
insert into optativa_private.commit_guard values(1) on conflict do nothing;
revoke all on all tables in schema optativa_private from public,anon,authenticated;

-- Only aggregated capacity and opening state are readable by browsers.
create table if not exists public.optativa_public_state(
 kind text not null check(kind in ('groups','config')), id text not null,
 data jsonb not null, primary key(kind,id)
);
alter table public.optativa_public_state enable row level security;
revoke all on public.optativa_public_state from anon,authenticated;
grant select on public.optativa_public_state to anon,authenticated;
drop policy if exists public_capacity_read on public.optativa_public_state;
create policy public_capacity_read on public.optativa_public_state for select to anon,authenticated using(true);

create or replace function public.optativa_get(p_collection text,p_id text)
returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('data',data,'version',version)
 from optativa_private.documents where collection=p_collection and id=p_id;
$$;
create or replace function public.optativa_list(p_collection text)
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(data order by id),'[]'::jsonb)
 from optativa_private.documents where collection=p_collection;
$$;
create or replace function public.optativa_search(p_section text,p_level text,p_prefix text)
returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(data),'[]'::jsonb) from (
  select data from optativa_private.documents
  where collection='students' and data->>'seccion'=p_section and data->>'nivel'=p_level
   and length(p_prefix) between 4 and 100
   and (data->>'nombreNormalizado') like replace(replace(replace(p_prefix,'\','\\'),'%','\%'),'_','\_') || '%'
  order by data->>'nombreNormalizado' limit 6
 ) matches;
$$;
create or replace function public.optativa_commit(p_reads jsonb,p_writes jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare r jsonb; w jsonb; current_version bigint; safe_data jsonb;
begin
 if jsonb_typeof(p_reads)<>'array' or jsonb_typeof(p_writes)<>'array'
  or jsonb_array_length(p_reads)>100 or jsonb_array_length(p_writes)>100 then
  raise exception 'Invalid transaction';
 end if;
 -- One database row lock serializes only the short commit section, not HTTP reads.
 perform id from optativa_private.commit_guard where id=1 for update;
 for r in select value from jsonb_array_elements(p_reads) loop
  select version into current_version from optativa_private.documents
   where collection=r->>'collection' and id=r->>'id';
  if coalesce(current_version,0)<>(r->>'version')::bigint then return false; end if;
 end loop;
 for w in select value from jsonb_array_elements(p_writes) loop
  if (w->>'delete')::boolean then
   delete from optativa_private.documents where collection=w->>'collection' and id=w->>'id';
   if w->>'collection' in ('groups','config') then
    delete from public.optativa_public_state where kind=w->>'collection' and id=w->>'id';
   end if;
  else
   insert into optativa_private.documents(collection,id,data,version)
    values(w->>'collection',w->>'id',w->'data',1)
   on conflict(collection,id) do update set data=excluded.data,version=optativa_private.documents.version+1;
   if w->>'collection'='groups' then
    safe_data=jsonb_build_object('id',w->>'id','subjectId',w->'data'->>'subjectId',
     'nombre',w->'data'->>'nombre','seccion',w->'data'->>'seccion','nivel',w->'data'->>'nivel',
     'cupoMaximo',25,'inscritos',(w->'data'->>'inscritos')::integer);
   elsif w->>'collection'='config' and w->>'id'='registration' then
    safe_data=jsonb_build_object('registrationOpen',w->'data'->'registrationOpen',
     'fechaInicio',w->'data'->'fechaInicio','fechaFin',w->'data'->'fechaFin');
   else safe_data=null;
   end if;
   if safe_data is not null then
    insert into public.optativa_public_state(kind,id,data) values(w->>'collection',w->>'id',safe_data)
    on conflict(kind,id) do update set data=excluded.data;
   end if;
  end if;
 end loop;
 return true;
end;
$$;

revoke all on function public.optativa_get(text,text) from public,anon,authenticated;
revoke all on function public.optativa_list(text) from public,anon,authenticated;
revoke all on function public.optativa_search(text,text,text) from public,anon,authenticated;
revoke all on function public.optativa_commit(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.optativa_get(text,text) to service_role;
grant execute on function public.optativa_list(text) to service_role;
grant execute on function public.optativa_search(text,text,text) to service_role;
grant execute on function public.optativa_commit(jsonb,jsonb) to service_role;

-- Realtime broadcasts only the public capacity table.
do $$
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(
  select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='optativa_public_state'
 ) then alter publication supabase_realtime add table public.optativa_public_state; end if;
end $$;
