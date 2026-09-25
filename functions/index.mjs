import {onCall,HttpsError} from 'firebase-functions/v2/https';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {FirestoreStore} from './server/firestore.mjs';
import {dispatch} from './server/service.mjs';
import {DomainError} from './server/domain.mjs';
initializeApp();
const store=new FirestoreStore(getFirestore());
export const api=onCall({enforceAppCheck:true,region:'us-central1',maxInstances:10,memory:'256MiB',timeoutSeconds:120},async request=>{
 try{
 const action=request.data?.action,data=request.data?.data||{};
 if(typeof action!=='string'||JSON.stringify(data).length>700000)throw new HttpsError('invalid-argument','Solicitud no válida.');
 const actor=request.auth?.token?.admin===true?(request.auth.token.email||request.auth.uid):null;
 return await dispatch(store,action,data,{actor,ip:request.rawRequest.ip||'unknown'});
 }catch(e){
 if(e instanceof HttpsError)throw e;
 if(e instanceof DomainError)throw new HttpsError(e.code==='UNAUTHORIZED'?'permission-denied':e.code==='RATE_LIMIT'?'resource-exhausted':'failed-precondition',e.message,{code:e.code});
 console.error('API failure',{name:e.name,code:e.code});
 throw new HttpsError('internal','Ha ocurrido un problema. Inténtalo nuevamente.');
 }
});
