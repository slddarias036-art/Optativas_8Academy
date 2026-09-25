let promise;
export const supabaseConfigured=!!import.meta.env.VITE_SUPABASE_URL&&!!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
async function client(){
 if(!supabaseConfigured)throw new Error('Las inscripciones aún no están habilitadas. El colegio debe conectar su proyecto Supabase.');
 if(!promise)promise=import('@supabase/supabase-js').then(({createClient})=>createClient(import.meta.env.VITE_SUPABASE_URL,import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{storage:window.sessionStorage,persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}));
 return promise;
}
export async function supabaseApi(action,data={}){
 const c=await client();
 if(action==='login'){
  const {data:session,error}=await c.auth.signInWithPassword({email:data.email,password:data.password});
  if(error)throw new Error('No pudimos iniciar sesión. Revisa tu correo y contraseña.');
  if(session.user.app_metadata?.role!=='admin'){await c.auth.signOut();throw new Error('Esta cuenta no tiene permisos de administrador.');}
  return {ok:true};
 }
 if(action==='logout'){await c.auth.signOut();return {};}
 if(action==='session'){const {data:{session}}=await c.auth.getSession();return {admin:session?.user.app_metadata?.role==='admin'};}
 const {data:{session}}=await c.auth.getSession();
 const response=await fetch(import.meta.env.VITE_SUPABASE_URL+'/functions/v1/optativas',{method:'POST',headers:{'Content-Type':'application/json',apikey:import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,...(session?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({action,data})});
 let result;try{result=await response.json();}catch{throw new Error('No pudimos conectar con el servidor. Inténtalo nuevamente.');}
 if(!response.ok||result.error){const error=new Error(result.error?.message||'No pudimos completar la solicitud. Inténtalo nuevamente.');error.code=result.error?.code;throw error;}
 return result;
}
export function subscribeSupabase(update,onError){
 let active=true,c,channel,timer,inFlight=false;
 if(!supabaseConfigured){queueMicrotask(()=>{if(active)update({config:{registrationOpen:false,setupPending:true},groups:[]});});return()=>{active=false;};}
 client().then(async instance=>{
  if(!active)return;c=instance;
  const refresh=async()=>{
   if(!active||inFlight)return;inFlight=true;
   try{const {data,error}=await c.from('optativa_public_state').select('kind,id,data');
    if(error)throw error;
    if(active)update({config:data.find(r=>r.kind==='config'&&r.id==='registration')?.data||{registrationOpen:false},groups:data.filter(r=>r.kind==='groups').map(r=>r.data)});
   }catch{if(active)onError(new Error('No pudimos actualizar los cupos. Comprueba tu conexión.'));}finally{inFlight=false;}
  };
  channel=c.channel('optativas-capacity').on('postgres_changes',{event:'*',schema:'public',table:'optativa_public_state'},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();if(status==='CHANNEL_ERROR'&&active)onError(new Error('Reconectando cupos…'));});
  await refresh();
  // Reconcile missed events after reconnect; this contains only public capacity.
  if(active)timer=setInterval(refresh,30000);
 }).catch(onError);
 return()=>{active=false;clearInterval(timer);if(c&&channel)c.removeChannel(channel);};
}
