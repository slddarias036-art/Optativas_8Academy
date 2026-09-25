import {createClient} from '@supabase/supabase-js';
import {SupabaseStore} from './shared/supabase.mjs';
import {dispatch,initialize} from './shared/service.mjs';
import {DomainError} from './shared/domain.mjs';
const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const store=new SupabaseStore(client);
const origin=Deno.env.get('ALLOWED_ORIGIN')||'https://slddarias036-art.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin'};
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return new Response('{}',{status:405,headers});
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return new Response('{}',{status:403,headers});
 try{
  if(!req.headers.get('content-type')?.startsWith('application/json'))throw new DomainError('INVALID','Formato no válido.');
  if(Number(req.headers.get('content-length'))>700000)throw new DomainError('INVALID','Archivo demasiado grande.');
  const reader=req.body?.getReader();if(!reader)throw new DomainError('INVALID','Solicitud vacía.');
  const chunks=[];let bytes=0;while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>700000){await reader.cancel();throw new DomainError('INVALID','Archivo demasiado grande.');}chunks.push(value);}
  const body=new Uint8Array(bytes);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.byteLength;}
  const {action,data={}}=JSON.parse(new TextDecoder().decode(body));
  if(typeof action!=='string'||!data||Array.isArray(data)||typeof data!=='object')throw new DomainError('INVALID','Solicitud no válida.');
  let actor=null;
  if(action.startsWith('admin.')){
   const token=req.headers.get('authorization')?.replace(/^Bearer /i,'');
   if(token){const {data:{user},error}=await client.auth.getUser(token);if(!error&&user?.app_metadata?.role==='admin')actor=user.email||user.id;}
   if(!actor)throw new DomainError('UNAUTHORIZED','Ingresa con una cuenta de administrador.');
  }
  if(action==='admin.initialize'){await initialize(store);return Response.json({ok:true},{headers});}
  const ip=req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim()||'unknown';
  const result=await dispatch(store,action,data,{ip,actor});
  return Response.json(result,{headers});
 }catch(e){
  const known=e instanceof DomainError||e.code==='CONTENTION';
  const status=e.code==='UNAUTHORIZED'?401:e.code==='RATE_LIMIT'?429:known?400:500;
  if(!known)console.error('optativas failure',{name:e.name,code:e.code});
  return Response.json({error:{code:known?e.code:'INTERNAL',message:known?e.message:'Ha ocurrido un problema. Inténtalo nuevamente.'}},{status,headers});
 }
});
