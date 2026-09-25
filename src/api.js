import {supabaseApi,subscribeSupabase} from './supabase-api.js';
import {sheetsApi,subscribeSheets} from './sheets-api.js';
export const sheetsMode=import.meta.env.VITE_BACKEND==='sheets';
export const firebaseMode=import.meta.env.VITE_BACKEND==='firebase';
export const supabaseMode=import.meta.env.VITE_BACKEND==='supabase';
export const cloudMode=firebaseMode||supabaseMode;
let fbPromise;
async function firebase(){
 if(!fbPromise)fbPromise=(async()=>{
 const [{initializeApp},{getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged},{getFunctions,httpsCallable},{initializeAppCheck,ReCaptchaV3Provider},{getFirestore,collection,doc,onSnapshot}]=await Promise.all([import('firebase/app'),import('firebase/auth'),import('firebase/functions'),import('firebase/app-check'),import('firebase/firestore')]);
 const app=initializeApp({apiKey:import.meta.env.VITE_FIREBASE_API_KEY,authDomain:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:import.meta.env.VITE_FIREBASE_PROJECT_ID,appId:import.meta.env.VITE_FIREBASE_APP_ID});
 initializeAppCheck(app,{provider:new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),isTokenAutoRefreshEnabled:true});
 return {auth:getAuth(app),invoke:httpsCallable(getFunctions(app,import.meta.env.VITE_FUNCTIONS_REGION||'us-central1'),'api'),signInWithEmailAndPassword,signOut,onAuthStateChanged,db:getFirestore(app),collection,doc,onSnapshot};
 })();return fbPromise;
}
export async function api(action,data={}){
 if(sheetsMode)return sheetsApi(action,data);
 if(supabaseMode)return supabaseApi(action,data);
 if(firebaseMode){
 const f=await firebase();
 if(action==='login'){await f.signInWithEmailAndPassword(f.auth,data.email,data.password);const t=await f.auth.currentUser.getIdTokenResult(true);if(!t.claims.admin){await f.signOut(f.auth);throw new Error('Esta cuenta no tiene permisos de administrador.');}return {ok:true};}
 if(action==='logout'){await f.signOut(f.auth);return {};}
 if(action==='session'){await f.auth.authStateReady();return {admin:!!f.auth.currentUser&&(await f.auth.currentUser.getIdTokenResult()).claims.admin===true};}
 try{return (await f.invoke({action,data})).data;}catch(e){const err=new Error(e.code==='functions/internal'?'Ha ocurrido un problema. Inténtalo nuevamente.':e.message);err.code=e.details?.code;throw err;}
 }
 const res=await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data})});const v=await res.json();
 if(v.error){const e=new Error(v.error.message);e.code=v.error.code;throw e;}return v;
}
export function subscribeStatus(update,error){
 if(sheetsMode)return subscribeSheets(update,error);
 if(supabaseMode)return subscribeSupabase(update,error);
 let active=true,unsubs=[],timer;
 if(firebaseMode){firebase().then(f=>{
 if(!active)return;let state={groups:[],config:null};
 unsubs.push(f.onSnapshot(f.collection(f.db,'groups'),snap=>{state={...state,groups:snap.docs.map(d=>({id:d.id,...d.data()}))};update(state);},error));
 unsubs.push(f.onSnapshot(f.doc(f.db,'config','registration'),snap=>{state={...state,config:snap.data()};update(state);},error));
 }).catch(error);
 }else{
 const stream=new EventSource('/events');stream.onmessage=e=>{if(active)update(JSON.parse(e.data));};stream.onerror=()=>{if(active)error(new Error('Sin conexión'));};unsubs.push(()=>stream.close());
 }
 return ()=>{active=false;clearTimeout(timer);unsubs.forEach(fn=>fn());};
}
