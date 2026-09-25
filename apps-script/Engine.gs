// Generated from tested domain/service sources; do not edit.
function buildEngine_(){
const randomUUID=()=>Utilities.getUuid();
const Papa={
 parse:(text,opts)=>{try{const rows=Utilities.parseCsv(text);const fields=(rows.shift()||[]).map(opts.transformHeader);const errors=[];const data=rows.filter(r=>r.some(v=>v.trim())).map((r,i)=>{if(r.length!==fields.length)errors.push({row:i,message:'Cantidad de columnas incorrecta.'});return Object.fromEntries(fields.map((k,n)=>[k,r[n]||'']));});return {data,errors,meta:{fields}};}catch(e){return {data:[],errors:[{row:0,message:'CSV inválido.'}],meta:{fields:[]}};}},
 unparse:rows=>{if(!rows.length)return '';const keys=Object.keys(rows[0]);const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return [keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\r\n');}
};
const levels = {basica:['8vo','9no','10mo'],bachillerato:['1ero BGU','2do BGU','3ro BGU']};
const sections = {basica:'Básica Superior',bachillerato:'Bachillerato'};
const subjects = [
 {id:'multimedia',nombre:'Multimedia y CC',secciones:['basica'],descripcion:'Cuenta historias con fotografía, video y contenido digital.',icon:'Camera',color:'blue'},
 {id:'robotica_ia',nombre:'Robótica IA',secciones:['basica'],descripcion:'Construye, programa y explora la inteligencia artificial.',icon:'Bot',color:'orange'},
 {id:'personal_branding',nombre:'Personal Branding',secciones:['basica','bachillerato'],descripcion:'Descubre tu identidad y comunica lo que te hace único.',icon:'Sparkles',color:'purple'},
 {id:'produccion_musical',nombre:'Producción Musical',secciones:['basica'],descripcion:'Transforma tus ideas en ritmos, sonidos y canciones.',icon:'Music',color:'pink'},
 {id:'video_mapping',nombre:'Video Mapping',secciones:['bachillerato'],descripcion:'Dale vida a los espacios con luz y proyecciones.',icon:'Projector',color:'blue'},
 {id:'no_code',nombre:'Programación No Code',secciones:['bachillerato'],descripcion:'Crea aplicaciones y soluciones sin escribir código.',icon:'Blocks',color:'orange'},
 {id:'diseno_grafico',nombre:'Diseño Gráfico',secciones:['bachillerato'],descripcion:'Convierte tus ideas en imágenes que comunican.',icon:'PenTool',color:'pink'}
];
const normalize = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const groupId = (nivel,subjectId) => `${nivel.replace(/ /g,'_')}_${subjectId}`;
const catalogGroups = () => Object.entries(levels).flatMap(([seccion,ns])=>ns.flatMap(nivel=>subjects.filter(s=>s.secciones.includes(seccion)).map(s=>({id:groupId(nivel,s.id),subjectId:s.id,nombre:s.nombre,seccion,nivel,cupoMaximo:25,inscritos:0}))));

class DomainError extends Error {constructor(code,message){super(message);this.code=code;}}
function fail(code,message){throw new DomainError(code,message);}
function scope(seccion,nivel){if(!levels[seccion]?.includes(nivel))fail('INVALID_SCOPE','Selecciona una sección y un nivel válidos.');}
function id(value){if(typeof value!=='string'|| !/^[\w-]{1,100}$/.test(value))fail('INVALID_ID','La selección no es válida.');return value;}
function isOpen(c){const now=Date.now();return !!c?.registrationOpen&&(!c.fechaInicio||now>=Date.parse(c.fechaInicio))&&(!c.fechaFin||now<=Date.parse(c.fechaFin));}
function cleanStudent(row){
 const sid=id(row.codigo_estudiante);scope(row.seccion,row.nivel);
 const name=String(row.nombreCompleto||`${row.apellidos||''} ${row.nombres||''}`).trim().replace(/\s+/g,' ');
 if(name.length<5||name.length>160||!String(row.paralelo||'').match(/^[A-Z]{1,2}$/))fail('INVALID_STUDENT','Revisa nombre completo y paralelo.');
 if(!row.nombreCompleto&&(!row.apellidos?.trim()||!row.nombres?.trim()))fail('INVALID_STUDENT','Faltan apellidos o nombres.');
 return {id:sid,codigo_estudiante:sid,apellidos:String(row.apellidos||'').trim(),nombres:String(row.nombres||'').trim(),nombreCompleto:name,nombreNormalizado:normalize(name),seccion:row.seccion,nivel:row.nivel,paralelo:row.paralelo,nombreSinSeparar:!row.apellidos||!row.nombres,matriculado:false,materiaAsignada:null,fechaMatricula:null};
}
const publicStudent=s=>({id:s.id,nombreCompleto:s.nombreCompleto,nivel:s.nivel,paralelo:s.paralelo});
function changeEnrollment(store,{studentId,seccion,nivel,subjectId,ticket},actor=null){
 id(studentId);scope(seccion,nivel);if(subjectId!==null)id(subjectId);
 const auditId=randomUUID();
 return store.transaction(tx=>{
  const student=tx.get('students',studentId), old=tx.get('enrollments',studentId), config=tx.get('config','registration');
  if(!actor){
   const proof=typeof ticket==='string'&&/^[a-f0-9-]{36}$/.test(ticket)?tx.get('tickets',ticket):null;
   if(!proof||proof.studentId!==studentId||proof.seccion!==seccion||proof.nivel!==nivel||proof.expiresAt<Date.now())fail('EXPIRED','Vuelve a buscar y seleccionar tu nombre.');
   if(!isOpen(config))fail('CLOSED','El proceso de matrícula se encuentra cerrado.');
  }
  if(!student||student.seccion!==seccion||student.nivel!==nivel)fail('INVALID_STUDENT','El estudiante no pertenece al nivel seleccionado.');
  if(!actor&&(old||student.matriculado))fail('ALREADY','Ya realizaste tu elección de materia optativa.');
  if(!actor&&subjectId===null)fail('FORBIDDEN','No puedes modificar tu matrícula.');
  const subject=subjects.find(s=>s.id===subjectId&&s.secciones.includes(seccion));
  if(subjectId!==null&&!subject)fail('INVALID_SUBJECT','Esta materia no corresponde a tu sección.');
  const targetId=subject?groupId(nivel,subjectId):null;
  const target=targetId?tx.get('groups',targetId):null;
  const previous=old?tx.get('groups',old.groupId):null;
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

const hash=s=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');
function initialize(store){
 store.transaction(tx=>{
  const config=tx.get('config','registration');
  const all=catalogGroups().map(g=>[g,tx.get('groups',g.id)]);
  if(!config)tx.set('config','registration',{registrationOpen:false,fechaInicio:null,fechaFin:null});
  for(const [g,existing]of all)if(!existing)tx.set('groups',g.id,g);
 });
}
function limit(store,key,max=50){
 const now=Date.now(),window=Math.floor(now/60000),doc=hash(key+window);
 store.transaction(tx=>{
  const row=tx.get('limits',doc);
  if((row?.count||0)>=max)fail('RATE_LIMIT','Has realizado muchas consultas. Espera un minuto e inténtalo nuevamente.');
  tx.set('limits',doc,{count:(row?.count||0)+1,expiresAt:now+120000});
 });
}
const sectionValue=v=>Object.keys(sections).find(k=>normalize(k)===normalize(v)||normalize(sections[k])===normalize(v))||v;
function parseImport(csv){
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
function importStudents(store,rows,actor){
 let imported=0,duplicates=0;
 // Each row is atomic; retries cannot overwrite students or existing enrollments.
 for(const row of rows){
 const student=cleanStudent(row),auditId=randomUUID();
 const added=store.transaction(tx=>{
  if(tx.get('students',student.id))return false;
  tx.set('students',student.id,student);
  tx.set('audit',auditId,{fecha:new Date().toISOString(),administrador:actor,accion:'ALTA_ESTUDIANTE',estudiante:student.id,anterior:null,nuevo:student});
  return true;
 });if(added)imported++;else duplicates++;
 }
 return {importados:imported,duplicados:duplicates};
}
function csvText(rows){
 // Prevent spreadsheet formula injection, including names beginning with symbols.
 const safe=rows.map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='string'&&/^[\s]*[=+@-]/.test(v)?"'"+v:v])));
 return '\uFEFF'+Papa.unparse(safe);
}
function dispatch(store,action,data={},ctx={}){
 const admin=action.startsWith('admin.');
 if(admin&&!ctx.actor)fail('UNAUTHORIZED','Ingresa con una cuenta de administrador.');
 if(!admin)limit(store,'ip:'+ctx.ip,action==='enroll'?150:240);
 if(action==='status')return {config:store.get('config','registration'),groups:store.list('groups')};
 if(action==='search'){
 scope(data.seccion,data.nivel);
 const q=normalize(data.query);
 if(q.length<4||q.length>100)fail('SHORT_QUERY','Escribe al menos 4 caracteres de tus apellidos.');
 limit(store,'search:'+ctx.ip,120);
 if(!isOpen(store.get('config','registration')))fail('CLOSED','El proceso de selección de materias optativas se encuentra cerrado.');
 const rows=store.search(data.seccion,data.nivel,q),result=[];
 for(const s of rows){
 const ticket=randomUUID();
 store.transaction(tx=>tx.set('tickets',ticket,{studentId:s.id,seccion:s.seccion,nivel:s.nivel,expiresAt:Date.now()+600000}));
 result.push({...publicStudent(s),ticket});
 }return result;
 }
 if(action==='select'){
 id(data.studentId);scope(data.seccion,data.nivel);
 const proof=typeof data.ticket==='string'&&/^[a-f0-9-]{36}$/.test(data.ticket)?store.get('tickets',data.ticket):null;
 if(!proof||proof.studentId!==data.studentId||proof.seccion!==data.seccion||proof.nivel!==data.nivel||proof.expiresAt<Date.now())fail('EXPIRED','Vuelve a buscar tu nombre.');
 const s=store.get('students',data.studentId);
 if(!s||s.seccion!==data.seccion||s.nivel!==data.nivel)fail('INVALID_STUDENT','No encontramos al estudiante.');
 return {student:publicStudent(s),enrollment:store.get('enrollments',s.id)};
 }
 if(action==='enroll')return changeEnrollment(store,data);
 if(action==='admin.change')return changeEnrollment(store,data,ctx.actor);
 if(action==='admin.dashboard'){
 const students=store.list('students');
 return {groups:store.list('groups'),config:store.get('config','registration'),total:students.length,enrolled:students.filter(s=>s.matriculado).length,byLevel:Object.fromEntries(Object.values(levels).flat().map(n=>[n,students.filter(s=>s.nivel===n).length]))};
 }
 if(action==='admin.students'){
 let rows=store.list('students');
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
 store.transaction(tx=>{
 const old=tx.get('config','registration');tx.set('config','registration',next);
 tx.set('audit',auditId,{fecha:new Date().toISOString(),administrador:ctx.actor,accion:'CONFIGURACION',estudiante:null,anterior:old,nuevo:next});
 });return next;
 }
 if(action==='admin.importPreview'){
 const p=parseImport(data.csv);let existing=0;
 for(const s of p.valid)if(store.get('students',s.id))existing++;
 return {validos:p.valid.length-existing,duplicados:p.duplicates+existing,errors:p.errors,muestra:p.valid.slice(0,8)};
 }
 if(action==='admin.import'){
 const p=parseImport(data.csv);if(p.errors.length)fail('INVALID_CSV','Corrige los errores antes de importar.');
 return {...importStudents(store,p.valid,ctx.actor),errores:0};
 }
 if(action==='admin.create')return importStudents(store,[cleanStudent({...data,seccion:sectionValue(data.seccion)})],ctx.actor);
 if(action==='admin.audit')return (store.list('audit')).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,100);
 if(action==='admin.export'){
 const students=store.list('students');
 if(data.type==='groups')return {csv:csvText((store.list('groups')).map(g=>({seccion:sections[g.seccion],nivel:g.nivel,materia:g.nombre,inscritos:g.inscritos,cupos_disponibles:25-g.inscritos})))};
 if(data.type==='levels')return {csv:csvText(Object.values(levels).flat().map(n=>({nivel:n,estudiantes:students.filter(s=>s.nivel===n).length,inscritos:students.filter(s=>s.nivel===n&&s.matriculado).length,sin_matricula:students.filter(s=>s.nivel===n&&!s.matriculado).length,cupos_disponibles:100-students.filter(s=>s.nivel===n&&s.matriculado).length})))};
 return {csv:csvText(students.filter(s=>data.type!=='pending'||!s.matriculado).map(s=>({codigo_estudiante:s.id,apellidos:s.apellidos,nombres:s.nombres,nombre_completo:s.nombreCompleto,nombre_sin_separar:s.nombreSinSeparar?'SI':'NO',seccion:sections[s.seccion],nivel:s.nivel,paralelo:s.paralelo,materia_asignada:subjects.find(x=>x.id===s.materiaAsignada)?.nombre||'',fecha_matricula:s.fechaMatricula||''})))};
 }
 fail('NOT_FOUND','No encontramos esa operación.');
}

return {dispatch,initialize,limit,DomainError};
}
