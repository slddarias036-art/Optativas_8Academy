const inAppsScript=()=>!!window.google?.script?.run;
function browserId(){let id=sessionStorage.getItem('optativa-client');if(!id){id=crypto.randomUUID();sessionStorage.setItem('optativa-client',id);}return id;}
export async function sheetsApi(action,data={}){
 if(!inAppsScript())throw new Error('Abre la inscripción desde el enlace publicado por el colegio.');
 return new Promise((resolve,reject)=>{
  const runner=window.google.script.run.withSuccessHandler(result=>{
   if(result?.error){const e=new Error(result.error.message);e.code=result.error.code;reject(e);}else resolve(result);
  }).withFailureHandler(()=>reject(new Error('No pudimos conectar con Google. Espera unos segundos e inténtalo de nuevo.')));
  if(action==='session'||action==='logout'||action.startsWith('admin.'))runner.optativaAdmin(action,data);
  else runner.optativaPublic(action,data,browserId());
 });
}
export function subscribeSheets(update,error){
 let active=true,timer;
 const poll=async()=>{try{const state=await sheetsApi('status');if(active)update(state);}catch(e){if(active)error(e);}finally{if(active)timer=setTimeout(poll,15000+Math.random()*3000);}};
 poll();return()=>{active=false;clearTimeout(timer);};
}
