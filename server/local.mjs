import http from 'node:http';
import {spawn} from 'node:child_process';
import {mkdirSync,existsSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {SQLiteStore} from './sqlite.mjs';
import {dispatch,initialize,importStudents,limit} from './service.mjs';
import {DomainError} from './domain.mjs';
export async function createServer({store,password,dev=false}){
 const sessions=new Map(),streams=new Set();let vite;
 const publish=async()=>{const payload=JSON.stringify({config:await store.get('config','registration'),groups:await store.list('groups')});for(const stream of streams)stream.write('data: '+payload+'\n\n');};
 if(dev){const {createServer}=await import('vite');vite=await createServer({configFile:false,server:{middlewareMode:true},appType:'spa'});}
 const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 res.setHeader('X-Content-Type-Options','nosniff');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Frame-Options','DENY');
 if(url.pathname==='/events'){
  res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});streams.add(res);await publish();const heartbeat=setInterval(()=>res.write(': keepalive\n\n'),20000);req.on('close',()=>{clearInterval(heartbeat);streams.delete(res);});return;
 }
 if(url.pathname==='/api'){
 res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json; charset=utf-8');
 try{
 if(req.method!=='POST'){res.writeHead(405);res.end('{}');return;}
 const host=req.headers.host||'';
 if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))throw new DomainError('FORBIDDEN','Solicitud no permitida.');
 if(req.headers.origin&&new URL(req.headers.origin).host!==host)throw new DomainError('FORBIDDEN','Solicitud no permitida.');
 if(!req.headers['content-type']?.startsWith('application/json'))throw new DomainError('FORBIDDEN','Formato no permitido.');
 let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>700000)throw new DomainError('TOO_LARGE','Archivo demasiado grande.');}
 const {action,data={}}=JSON.parse(raw);
 const ip=req.socket.remoteAddress||'local';
 const token=req.headers.cookie?.match(/(?:^|; )admin_session=([a-f0-9]+)/)?.[1];
 const session=token?sessions.get(token):null;
 const actor=session&&session.expires>Date.now()?'administrador-local':null;
 if(action==='login'){
 await limit(store,'login:'+ip,10);
 const supplied=Buffer.from(String(data.password||'')),expected=Buffer.from(password);
 if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw new DomainError('UNAUTHORIZED','Contraseña incorrecta.');
 const token=randomBytes(32).toString('hex');sessions.set(token,{expires:Date.now()+3600000});
 res.setHeader('Set-Cookie','admin_session='+token+'; HttpOnly; SameSite=Strict; Path=/api; Max-Age=3600');res.end(JSON.stringify({ok:true}));return;
 }
 if(action==='logout'){if(token)sessions.delete(token);res.setHeader('Set-Cookie','admin_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0');res.end('{}');return;}
 if(action==='session'){res.end(JSON.stringify({admin:!!actor}));return;}
 const result=await dispatch(store,action,data,{ip,actor});res.end(JSON.stringify(result));if(['enroll','admin.change','admin.config'].includes(action))await publish();
 }catch(e){
 const expected=e instanceof DomainError;
 if(!expected)console.error('API failure',e.name,e.message);
 res.statusCode=e.code==='UNAUTHORIZED'?401:e.code==='RATE_LIMIT'?429:expected?400:500;
 res.end(JSON.stringify({error:{code:expected?e.code:'INTERNAL',message:expected?e.message:'Ha ocurrido un problema. Inténtalo nuevamente.'}}));
 }return;
 }
 if(vite){vite.middlewares(req,res);return;}
 const name=resolve('dist','.'+decodeURIComponent(url.pathname));
 const root=resolve('dist');
 // Resolve only regular assets within dist; never expose source or private files.
 const safe=name.startsWith(root+ (process.platform==='win32'?'\\':'/'))&&existsSync(name)&&extname(name)?name:resolve(root,'index.html');
 try{res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[extname(safe)]||'application/octet-stream');res.end(readFileSync(safe));}catch{res.writeHead(404);res.end('Primero ejecuta npm run build.');}
 });
 server.on('close',()=>vite?.close());return server;
}
if(process.argv[1]&&resolve(process.argv[1])===resolve('server/local.mjs')){
 try{process.loadEnvFile('.env');}catch{}
 mkdirSync('private',{recursive:true});const store=new SQLiteStore('private/optativas.sqlite');
 await initialize(store);
 if((await store.list('students')).length===0&&existsSync('private/roster.json'))await importStudents(store,JSON.parse(readFileSync('private/roster.json','utf8')),'importacion-inicial-local');
 let password=process.env.ADMIN_PASSWORD;
 if(!password){const p='private/admin-password.txt';password=existsSync(p)?readFileSync(p,'utf8').trim():randomBytes(18).toString('base64url');if(!existsSync(p))writeFileSync(p,password,{mode:0o600});}
 const port=Number(process.env.PORT||5173),dev=!existsSync('dist/index.html');
 const server=await createServer({store,password,dev});
 const openBrowser=()=>{if(process.argv.includes('--open')&&process.platform==='win32')spawn('cmd.exe',['/c','start','','http://127.0.0.1:'+port],{windowsHide:true,stdio:'ignore'});};
 server.on('error',e=>{if(e.code==='EADDRINUSE'){console.log('La aplicación ya está iniciada en http://127.0.0.1:'+port);openBrowser();store.close();}else{console.error('No fue posible iniciar el servidor:',e.code);process.exitCode=1;}});
 server.listen(port,'127.0.0.1',()=>{console.log('Optativas: http://127.0.0.1:'+port+' | Administración: /admin | contraseña local: private/admin-password.txt o ADMIN_PASSWORD');openBrowser();});
}
