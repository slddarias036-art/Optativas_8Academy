import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {randomUUID} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';import {SupabaseStore} from '../server/supabase.mjs';import {initialize,dispatch} from '../server/service.mjs';import {changeEnrollment,cleanStudent} from '../server/domain.mjs';
test('PostgreSQL: adaptador Supabase, transacciones, permisos y concurrencia',async t=>{
 const db=new PGlite();await db.exec('create role anon; create role authenticated; create role service_role;');
 await db.exec(readFileSync('supabase/migrations/202609250001_optativas.sql','utf8'));
 const functions={optativa_get:['p_collection','p_id'],optativa_list:['p_collection'],optativa_search:['p_section','p_level','p_prefix'],optativa_commit:['p_reads','p_writes']};
 const client={rpc:async(name,args)=>{try{const values=functions[name].map(k=>typeof args[k]==='object'?JSON.stringify(args[k]):args[k]);const {rows}=await db.query('select public.'+name+'('+values.map((_,i)=>'$'+(i+1)).join(',')+') as result',values);return {data:rows[0].result,error:null};}catch(error){return {data:null,error};}}};
 const store=new SupabaseStore(client);
 async function fixture(n=110){
  await db.exec('truncate optativa_private.documents; truncate public.optativa_public_state;');await initialize(store);
  for(let start=0;start<n;start+=80)await store.transaction(async tx=>{for(let i=start;i<Math.min(n,start+80);i++)tx.set('students','P'+i,cleanStudent({codigo_estudiante:'P'+i,apellidos:'PRUEBA MUÑOZ',nombres:'ESTUDIANTE '+i,seccion:'basica',nivel:'9no',paralelo:'A'}));});
  await store.transaction(async tx=>tx.set('config','registration',{registrationOpen:true}));
 }
 async function args(i,subjectId='robotica_ia'){
  const ticket=randomUUID();await store.transaction(async tx=>tx.set('tickets',ticket,{studentId:'P'+i,seccion:'basica',nivel:'9no',expiresAt:Date.now()+600000}));
  return {studentId:'P'+i,seccion:'basica',nivel:'9no',ticket,subjectId};
 }
 await t.test('conflicto de versión se rechaza sin escritura parcial',async()=>{await fixture(1);const a=await store.record('students','P0');await store.transaction(async tx=>tx.set('students','P0',{...a.data,paralelo:'B'}));const ok=await store.rpc('optativa_commit',{p_reads:[{collection:'students',id:'P0',version:a.version}],p_writes:[{collection:'enrollments',id:'P0',data:{studentId:'P0'},delete:false}]});assert.equal(ok,false);assert.equal(await store.get('enrollments','P0'),null);});
 await t.test('100 solicitudes concurrentes, solo 25 matrículas y ningún sobrecupo',async()=>{
  await fixture();const inputs=await Promise.all(Array.from({length:100},(_,i)=>args(i)));
  const start=Date.now(),r=await Promise.allSettled(inputs.map(a=>changeEnrollment(store,a)));
  const accepted=r.filter(x=>x.status==='fulfilled').length,rejected=r.filter(x=>x.status==='rejected'&&x.reason.code==='FULL').length;
  assert.equal(accepted,25);assert.equal(rejected,75);const es=await store.list('enrollments'),groups=await store.list('groups');
  for(const g of groups){assert.ok(g.inscritos<=25);assert.equal(g.inscritos,es.filter(e=>e.groupId===g.id).length);}
  assert.equal(new Set(es.map(e=>e.studentId)).size,25);
  mkdirSync('reports',{recursive:true});writeFileSync('reports/supabase-concurrency.json',JSON.stringify({fecha:new Date().toISOString(),motor:'PostgreSQL embebido PGlite, migración SQL y adaptador reales; transporte RPC local de pruebas',solicitudes:100,aceptadas:accepted,rechazadasPorCupo:rejected,sobrecupos:0,gruposComprobados:groups.length,duracionMs:Date.now()-start,resultado:'PASS',limite:'No valida Supabase remoto ni su red, límites o Realtime.'},null,2));
 });
 await t.test('reintentos del mismo estudiante no duplican matrícula',async()=>{await fixture(1);const a=await args(0);const r=await Promise.allSettled(Array.from({length:12},()=>changeEnrollment(store,a)));assert.equal(r.filter(x=>x.status==='fulfilled').length,1);assert.equal((await store.get('groups','9no_robotica_ia')).inscritos,1);});
 await t.test('cambio administrativo y liberación mantienen contadores y auditoría',async()=>{await fixture(1);await changeEnrollment(store,await args(0));await changeEnrollment(store,await args(0,'multimedia'),'test-admin');assert.equal((await store.get('groups','9no_robotica_ia')).inscritos,0);assert.equal((await store.get('groups','9no_multimedia')).inscritos,1);await changeEnrollment(store,{...await args(0),subjectId:null},'test-admin');assert.equal((await store.get('groups','9no_multimedia')).inscritos,0);assert.equal((await store.list('audit')).length,2);});
 await t.test('base de datos rechaza 26 cupos y revierte toda la transacción',async()=>{await fixture(1);const group=await store.get('groups','9no_robotica_ia');await assert.rejects(store.transaction(async tx=>{tx.set('enrollments','P0',{studentId:'P0'});tx.set('groups',group.id,{...group,inscritos:26});}));assert.equal(await store.get('enrollments','P0'),null);assert.equal((await store.get('groups',group.id)).inscritos,0);});
 await t.test('anon y authenticated no leen nómina, no llaman RPC ni escriben cupos',async()=>{
  await fixture(1);for(const role of ['anon','authenticated']){
   await db.exec('set role '+role);
   try{assert.equal((await db.query('select * from public.optativa_public_state')).rows.length,25);
    await assert.rejects(db.query("select * from optativa_private.documents"));
    await assert.rejects(db.query("select public.optativa_get('students','P0')"));
    await assert.rejects(db.query("update public.optativa_public_state set data='{}'"));
   }finally{await db.exec('reset role');}
  }
 });
 await t.test('búsqueda privada, limitada por curso, y acciones sin autorización',async()=>{await fixture(20);const r=await dispatch(store,'search',{seccion:'basica',nivel:'9no',query:'prueba munoz'},{ip:'test'});assert.equal(r.length,6);assert.equal((await store.search('basica','8vo','prueba')).length,0);await assert.rejects(dispatch(store,'admin.students',{},{}),{code:'UNAUTHORIZED'});});
 await db.close();
});
