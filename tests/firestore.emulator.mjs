// Explicit opt-in: never touches a real project.
import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {initializeApp} from 'firebase-admin/app';import {getFirestore} from 'firebase-admin/firestore';
import {FirestoreStore} from '../server/firestore.mjs';import {initialize} from '../server/service.mjs';import {changeEnrollment} from '../server/domain.mjs';
if(!/^127\.0\.0\.1:\d+$|^localhost:\d+$/.test(process.env.FIRESTORE_EMULATOR_HOST||''))throw new Error('Requiere FIRESTORE_EMULATOR_HOST local. Nunca ejecutar contra producción.');
initializeApp({projectId:'demo-optativas-test'});const db=getFirestore();const store=new FirestoreStore(db);await initialize(store);const prefix=randomUUID().slice(0,8),inputs=[];
await db.recursiveDelete(db.collection('enrollments'));await db.recursiveDelete(db.collection('students'));await db.recursiveDelete(db.collection('groups'));await initialize(store);
await store.transaction(async tx=>tx.set('config','registration',{registrationOpen:true}));
for(let i=0;i<100;i++){const studentId=prefix+'-'+i,ticket=randomUUID();await db.collection('students').doc(studentId).set({id:studentId,nombreCompleto:'PRUEBA '+i,seccion:'basica',nivel:'9no',paralelo:'A',matriculado:false});await db.collection('tickets').doc(ticket).set({studentId,seccion:'basica',nivel:'9no',expiresAt:Date.now()+600000});inputs.push({studentId,ticket,seccion:'basica',nivel:'9no',subjectId:'robotica_ia'});}
const r=await Promise.allSettled(inputs.map(a=>changeEnrollment(store,a)));
assert.equal(r.filter(x=>x.status==='fulfilled').length,25);
assert.equal(r.filter(x=>x.status==='rejected'&&x.reason.code==='FULL').length,75);
const groups=await store.list('groups'),es=await store.list('enrollments');
for(const g of groups){assert.ok(g.inscritos<=25);assert.equal(g.inscritos,es.filter(e=>e.groupId===g.id).length);}
await assert.rejects(changeEnrollment(store,inputs[r.findIndex(x=>x.status==='fulfilled')]),{code:'ALREADY'});
console.log('PASS Firestore Emulator: 100 concurrentes, 25 matrículas, sin sobrecupos ni duplicados.');await db.terminate();
