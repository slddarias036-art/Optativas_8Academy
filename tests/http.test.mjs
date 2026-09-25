import test from 'node:test';import assert from 'node:assert/strict';import {SQLiteStore} from '../server/sqlite.mjs';import {initialize,importStudents} from '../server/service.mjs';import {createServer} from '../server/local.mjs';
test('HTTP: protección admin, sesión, cierre, importación y exportación',async()=>{
 const store=new SQLiteStore();await initialize(store);const server=await createServer({store,password:'test-password-not-production'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let cookie='';
 const request=async(action,data={},headers={})=>{const res=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,...headers},body:JSON.stringify({action,data})});return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')};};
 try{
 assert.equal((await request('admin.dashboard')).status,401);
 assert.equal((await request('login',{password:'wrong'})).status,401);
 const login=await request('login',{password:'test-password-not-production'});assert.equal(login.status,200);assert.ok(login.cookie.includes('HttpOnly'));cookie=login.cookie.split(';')[0];
 assert.equal((await request('admin.dashboard')).body.total,0);
 assert.equal((await request('admin.config',{registrationOpen:true})).status,200);
 const csv='codigo_estudiante,apellidos,nombres,seccion,nivel,paralelo\nHTTP1,PÉREZ GARCÍA,ANA,basica,8vo,A';
 assert.equal((await request('admin.importPreview',{csv})).body.validos,1);
 assert.equal((await request('admin.import',{csv})).body.importados,1);
 assert.equal((await request('admin.export',{type:'students'})).body.csv.includes('PÉREZ GARCÍA'),true);
 assert.equal((await request('admin.dashboard',{}, {Origin:'https://evil.example'})).status,400);
 await request('logout');assert.equal((await request('admin.dashboard')).status,401);
 }finally{await new Promise(r=>server.close(r));store.close();}
});
test('SSE entrega actualización al cambiar apertura',async()=>{
 const store=new SQLiteStore();await initialize(store);const server=await createServer({store,password:'test-password'});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const abort=new AbortController();
 try{
 const stream=await fetch(base+'/events',{signal:abort.signal}),reader=stream.body.getReader(),decode=new TextDecoder();
 assert.ok(decode.decode((await reader.read()).value).includes('"registrationOpen":false'));
 const login=await fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',data:{password:'test-password'}})});const cookie=login.headers.get('set-cookie').split(';')[0];await login.json();
 const changed=fetch(base+'/api',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({action:'admin.config',data:{registrationOpen:true}})});
 assert.ok(decode.decode((await reader.read()).value).includes('"registrationOpen":true'));await (await changed).json();await reader.cancel();
 }finally{abort.abort();server.closeAllConnections();await new Promise(r=>server.close(r));store.close();}
});
