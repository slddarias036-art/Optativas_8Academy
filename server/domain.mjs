import {randomUUID} from 'node:crypto';
import {levels,subjects,groupId,normalize} from './catalog.mjs';
export class DomainError extends Error {constructor(code,message){super(message);this.code=code;}}
export function fail(code,message){throw new DomainError(code,message);}
export function scope(seccion,nivel){if(!levels[seccion]?.includes(nivel))fail('INVALID_SCOPE','Selecciona una sección y un nivel válidos.');}
export function id(value){if(typeof value!=='string'|| !/^[\w-]{1,100}$/.test(value))fail('INVALID_ID','La selección no es válida.');return value;}
export function isOpen(c){const now=Date.now();return !!c?.registrationOpen&&(!c.fechaInicio||now>=Date.parse(c.fechaInicio))&&(!c.fechaFin||now<=Date.parse(c.fechaFin));}
export function cleanStudent(row){
 const sid=id(row.codigo_estudiante);scope(row.seccion,row.nivel);
 const name=String(row.nombreCompleto||`${row.apellidos||''} ${row.nombres||''}`).trim().replace(/\s+/g,' ');
 if(name.length<5||name.length>160||!String(row.paralelo||'').match(/^[A-Z]{1,2}$/))fail('INVALID_STUDENT','Revisa nombre completo y paralelo.');
 if(!row.nombreCompleto&&(!row.apellidos?.trim()||!row.nombres?.trim()))fail('INVALID_STUDENT','Faltan apellidos o nombres.');
 return {id:sid,codigo_estudiante:sid,apellidos:String(row.apellidos||'').trim(),nombres:String(row.nombres||'').trim(),nombreCompleto:name,nombreNormalizado:normalize(name),seccion:row.seccion,nivel:row.nivel,paralelo:row.paralelo,nombreSinSeparar:!row.apellidos||!row.nombres,matriculado:false,materiaAsignada:null,fechaMatricula:null};
}
export const publicStudent=s=>({id:s.id,nombreCompleto:s.nombreCompleto,nivel:s.nivel,paralelo:s.paralelo});
export async function changeEnrollment(store,{studentId,seccion,nivel,subjectId,ticket},actor=null){
 id(studentId);scope(seccion,nivel);if(subjectId!==null)id(subjectId);
 const auditId=randomUUID();
 return store.transaction(async tx=>{
  const student=await tx.get('students',studentId), old=await tx.get('enrollments',studentId), config=await tx.get('config','registration');
  if(!actor){
   const proof=typeof ticket==='string'&&/^[a-f0-9-]{36}$/.test(ticket)?await tx.get('tickets',ticket):null;
   if(!proof||proof.studentId!==studentId||proof.seccion!==seccion||proof.nivel!==nivel||proof.expiresAt<Date.now())fail('EXPIRED','Vuelve a buscar y seleccionar tu nombre.');
   if(!isOpen(config))fail('CLOSED','El proceso de matrícula se encuentra cerrado.');
  }
  if(!student||student.seccion!==seccion||student.nivel!==nivel)fail('INVALID_STUDENT','El estudiante no pertenece al nivel seleccionado.');
  if(!actor&&(old||student.matriculado))fail('ALREADY','Ya realizaste tu elección de materia optativa.');
  if(!actor&&subjectId===null)fail('FORBIDDEN','No puedes modificar tu matrícula.');
  const subject=subjects.find(s=>s.id===subjectId&&s.secciones.includes(seccion));
  if(subjectId!==null&&!subject)fail('INVALID_SUBJECT','Esta materia no corresponde a tu sección.');
  const targetId=subject?groupId(nivel,subjectId):null;
  const target=targetId?await tx.get('groups',targetId):null;
  const previous=old?await tx.get('groups',old.groupId):null;
  if(subject&&(!target||target.subjectId!==subjectId||target.nivel!==nivel||target.seccion!==seccion||target.cupoMaximo!==25))fail('INVALID_SUBJECT','La materia no está disponible para este nivel.');
  if(old?.groupId===targetId)return {student:publicStudent(student),enrollment:old};
  if(target&&target.inscritos>=25)fail('FULL','El último cupo acaba de ser asignado a otro estudiante. No pudimos completar tu matrícula. Intenta seleccionar otra materia.');
  if(previous&&previous.inscritos<1)fail('INTEGRITY','No fue posible completar el cambio. Contacta al administrador.');
  if(old&&!previous)fail('INTEGRITY','No fue posible completar el cambio. Contacta al administrador.');
  const date=new Date().toISOString();
  const next=target?{studentId,subjectId,groupId:targetId,nivel,seccion,fechaRegistro:date}:null;
  if(previous)tx.set('groups',old.groupId,{...previous,inscritos:previous.inscritos-1});
  if(target)tx.set('groups',targetId,{...target,inscritos:target.inscritos+1});
  if(next)tx.set('enrollments',studentId,next);else tx.delete('enrollments',studentId);
  tx.set('students',studentId,{...student,matriculado:!!next,materiaAsignada:subjectId,fechaMatricula:next?date:null});
  if(actor)tx.set('audit',auditId,{fecha:date,administrador:actor,accion:next?'CAMBIO_MATERIA':'LIBERAR_MATRICULA',estudiante:studentId,anterior:old||null,nuevo:next});
  return {student:publicStudent(student),enrollment:next};
 });
}
