import {randomUUID,createHash} from 'node:crypto';
import Papa from 'papaparse';
import {normalize,sections,levels,catalogGroups,subjects} from './catalog.mjs';
import {scope,id,fail,cleanStudent,publicStudent,changeEnrollment,isOpen} from './domain.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
export async function initialize(store){
 await store.transaction(async tx=>{
  const config=await tx.get('config','registration');
  const all=await Promise.all(catalogGroups().map(async g=>[g,await tx.get('groups',g.id)]));
  if(!config)tx.set('config','registration',{registrationOpen:false,fechaInicio:null,fechaFin:null});
  for(const [g,existing]of all)if(!existing)tx.set('groups',g.id,g);
 });
}
export async function limit(store,key,max=50){
 const now=Date.now(),window=Math.floor(now/60000),doc=hash(key+window);
 await store.transaction(async tx=>{
  const row=await tx.get('limits',doc);
  if((row?.count||0)>=max)fail('RATE_LIMIT','Has realizado muchas consultas. Espera un minuto e inténtalo nuevamente.');
  tx.set('limits',doc,{count:(row?.count||0)+1,expiresAt:now+120000});
 });
}
const sectionValue=v=>Object.keys(sections).find(k=>normalize(k)===normalize(v)||normalize(sections[k])===normalize(v))||v;
export function parseImport(csv){
 if(typeof csv!=='string'||csv.length>600000)fail('INVALID_CSV','El archivo supera el tamaño permitido.');
 const parsed=Papa.parse(csv.replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()});
 const required=['codigo_estudiante','apellidos','nombres','seccion','nivel','paralelo'];
 if(!required.every(k=>parsed.meta.fields?.includes(k)))fail('INVALID_CSV','Columnas requeridas: '+required.join(', '));
 if(parsed.data.length>1500)fail('INVALID_CSV','Importa como máximo 1500 filas por archivo.');
 const valid=[],errors=parsed.errors.map(e=>({fila:(e.row??0)+2,error:e.message})),seen=new Set();
 let duplicates=0;
 parsed.data.forEach((r,i)=>{try{
 const s=cleanStudent({...r,seccion:sectionValue(r.seccion)});
 if(seen.has(s.id)){duplicates++;errors.push({fila:i+2,error:'Código duplicado en el archivo.'});return;}
 seen.add(s.id);valid.push(s);
 }catch(e){errors.push({fila:i+2,error:e.message});}});
 return {valid,errors,duplicates};
}
export async function importStudents(store,rows,actor){
 let imported=0,duplicates=0;
 // Each row is atomic; retries cannot overwrite students or existing enrollments.
 for(const row of rows){
 const student=cleanStudent(row),auditId=randomUUID();
 const added=await store.transaction(async tx=>{
  if(await tx.get('students',student.id))return false;
  tx.set('students',student.id,student);
  tx.set('audit',auditId,{fecha:new Date().toISOString(),administrador:actor,accion:'ALTA_ESTUDIANTE',estudiante:student.id,anterior:null,nuevo:student});
  return true;
 });if(added)imported++;else duplicates++;
 }
 return {importados:imported,duplicados:duplicates};
}
export function csvText(rows){
 // Prevent spreadsheet formula injection, including names beginning with symbols.
 const safe=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?"'"+v:v])));
 return '\uFEFF'+Papa.unparse(safe);
}
export async function dispatch(store,action,data={},ctx={}){
 const admin=action.startsWith('admin.');
 if(admin&&!ctx.actor)fail('UNAUTHORIZED','Ingresa con una cuenta de administrador.');
 if(!admin)await limit(store,'ip:'+ctx.ip,action==='enroll'?150:240);
 if(action==='status')return {config:await store.get('config','registration'),groups:await store.list('groups')};
 if(action==='search'){
 scope(data.seccion,data.nivel);
 const q=normalize(data.query);
 if(q.length<4||q.length>100)fail('SHORT_QUERY','Escribe al menos 4 caracteres de tus apellidos.');
 await limit(store,'search:'+ctx.ip,120);
 if(!isOpen(await store.get('config','registration')))fail('CLOSED','El proceso de selección de materias optativas se encuentra cerrado.');
 const rows=await store.search(data.seccion,data.nivel,q),result=[];
 for(const s of rows){
 const ticket=randomUUID();
 await store.transaction(async tx=>tx.set('tickets',ticket,{studentId:s.id,seccion:s.seccion,nivel:s.nivel,expiresAt:Date.now()+600000}));
 result.push({...publicStudent(s),ticket});
 }return result;
 }
 if(action==='select'){
 id(data.studentId);scope(data.seccion,data.nivel);
 const proof=typeof data.ticket==='string'&&/^[a-f0-9-]{36}$/.test(data.ticket)?await store.get('tickets',data.ticket):null;
 if(!proof||proof.studentId!==data.studentId||proof.seccion!==data.seccion||proof.nivel!==data.nivel||proof.expiresAt<Date.now())fail('EXPIRED','Vuelve a buscar tu nombre.');
 const s=await store.get('students',data.studentId);
 if(!s||s.seccion!==data.seccion||s.nivel!==data.nivel)fail('INVALID_STUDENT','No encontramos al estudiante.');
 return {student:publicStudent(s),enrollment:await store.get('enrollments',s.id)};
 }
 if(action==='enroll')return changeEnrollment(store,data);
 if(action==='admin.change')return changeEnrollment(store,data,ctx.actor);
 if(action==='admin.dashboard'){
 const students=await store.list('students');
 return {groups:await store.list('groups'),config:await store.get('config','registration'),total:students.length,enrolled:students.filter(s=>s.matriculado).length,byLevel:Object.fromEntries(Object.values(levels).flat().map(n=>[n,students.filter(s=>s.nivel===n).length]))};
 }
 if(action==='admin.students'){
 let rows=await store.list('students');
 for(const f of ['seccion','nivel','paralelo'])if(data[f])rows=rows.filter(s=>s[f]===data[f]);
 if(data.subjectId)rows=rows.filter(s=>s.materiaAsignada===data.subjectId);
 if(data.unenrolled)rows=rows.filter(s=>!s.matriculado);
 if(data.query)rows=rows.filter(s=>s.nombreNormalizado.includes(normalize(data.query))||s.id===data.query);
 const page=Math.max(0,Number(data.page)||0);return {total:rows.length,rows:rows.slice(page*50,page*50+50)};
 }
 if(action==='admin.config'){
 if(typeof data.registrationOpen!=='boolean')fail('INVALID_CONFIG','Estado inválido.');
 for(const key of ['fechaInicio','fechaFin'])if(data[key]&&!Number.isFinite(Date.parse(data[key])))fail('INVALID_CONFIG','Fecha inválida.');
 if(data.fechaInicio&&data.fechaFin&&Date.parse(data.fechaFin)<=Date.parse(data.fechaInicio))fail('INVALID_CONFIG','La fecha final debe ser posterior a la inicial.');
 const next={registrationOpen:data.registrationOpen,fechaInicio:data.fechaInicio||null,fechaFin:data.fechaFin||null},auditId=randomUUID();
 await store.transaction(async tx=>{
 const old=await tx.get('config','registration');tx.set('config','registration',next);
 tx.set('audit',auditId,{fecha:new Date().toISOString(),administrador:ctx.actor,accion:'CONFIGURACION',estudiante:null,anterior:old,nuevo:next});
 });return next;
 }
 if(action==='admin.importPreview'){
 const p=parseImport(data.csv);let existing=0;
 for(const s of p.valid)if(await store.get('students',s.id))existing++;
 return {validos:p.valid.length-existing,duplicados:p.duplicates+existing,errors:p.errors,muestra:p.valid.slice(0,8)};
 }
 if(action==='admin.import'){
 const p=parseImport(data.csv);if(p.errors.length)fail('INVALID_CSV','Corrige los errores antes de importar.');
 return {...await importStudents(store,p.valid,ctx.actor),errores:0};
 }
 if(action==='admin.create')return importStudents(store,[cleanStudent({...data,seccion:sectionValue(data.seccion)})],ctx.actor);
 if(action==='admin.audit')return (await store.list('audit')).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,100);
 if(action==='admin.export'){
 const students=await store.list('students');
 if(data.type==='groups')return {csv:csvText((await store.list('groups')).map(g=>({seccion:sections[g.seccion],nivel:g.nivel,materia:g.nombre,inscritos:g.inscritos,cupos_disponibles:25-g.inscritos})))};
 if(data.type==='levels')return {csv:csvText(Object.values(levels).flat().map(n=>({nivel:n,estudiantes:students.filter(s=>s.nivel===n).length,inscritos:students.filter(s=>s.nivel===n&&s.matriculado).length,sin_matricula:students.filter(s=>s.nivel===n&&!s.matriculado).length,cupos_disponibles:100-students.filter(s=>s.nivel===n&&s.matriculado).length})))};
 return {csv:csvText(students.filter(s=>data.type!=='pending'||!s.matriculado).map(s=>({codigo_estudiante:s.id,apellidos:s.apellidos,nombres:s.nombres,nombre_completo:s.nombreCompleto,nombre_sin_separar:s.nombreSinSeparar?'SI':'NO',seccion:sections[s.seccion],nivel:s.nivel,paralelo:s.paralelo,materia_asignada:subjects.find(x=>x.id===s.materiaAsignada)?.nombre||'',fecha_matricula:s.fechaMatricula||''})))};
 }
 fail('NOT_FOUND','No encontramos esa operación.');
}
