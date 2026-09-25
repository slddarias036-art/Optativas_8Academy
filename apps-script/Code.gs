// All helper functions end in "_" and cannot be invoked by google.script.run.
function onOpen() {
 SpreadsheetApp.getUi().createMenu('Optativas').addItem('Preparar sistema (solo primera vez)','iniciarOptativas_').addItem('Abrir panel administrativo','abrirPanel_').addToUi();
}
function iniciarOptativas_() {
 const sheet=SpreadsheetApp.getActiveSpreadsheet();
 if(!sheet)throw new Error('Ejecuta la preparación desde la hoja privada.');
 const email=Session.getActiveUser().getEmail();
 if(!email||email!==Session.getEffectiveUser().getEmail())throw new Error('El propietario debe preparar el sistema desde su hoja.');
 const props=PropertiesService.getScriptProperties();
 if(props.getProperty('ADMIN_EMAILS'))requireAdmin_();
 props.setProperty('SPREADSHEET_ID',sheet.getId());
 if(!props.getProperty('ADMIN_EMAILS'))props.setProperty('ADMIN_EMAILS',email.toLowerCase());
 let tab=sheet.getSheetByName('REGISTROS');
 if(!tab){tab=sheet.insertSheet('REGISTROS');tab.getRange(1,1,1,3).setValues([['coleccion','id','datos_json']]);tab.setFrozenRows(1);}
 const lock=LockService.getScriptLock();lock.waitLock(10000);
 try{const store=createStore_();buildEngine_().initialize(store);store.commit();}finally{lock.releaseLock();}
 SpreadsheetApp.getUi().alert('Sistema preparado y matrículas cerradas. Abre el panel para importar la nómina. No edites REGISTROS manualmente.');
}
function requireAdmin_() {
 const email=Session.getActiveUser().getEmail().toLowerCase();
 const allowed=(PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS')||'').split(',').map(s=>s.trim().toLowerCase());
 if(!email||!allowed.includes(email))throw new Error('Acceso exclusivo para administradores autorizados. Abre el panel desde la hoja privada.');
 return email;
}
function abrirPanel_(){
 requireAdmin_();
 const template=HtmlService.createTemplateFromFile('App');template.admin=true;
 SpreadsheetApp.getUi().showModalDialog(template.evaluate().setWidth(1200).setHeight(780),'Administración de optativas');
}
function doGet(){
 const template=HtmlService.createTemplateFromFile('App');template.admin=false;
 return template.evaluate().setTitle('Optativas · Eight Academy').addMetaTag('viewport','width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function optativaPublic(action,data,clientId){
 if(!['status','search','select','enroll'].includes(action))return {error:{code:'FORBIDDEN',message:'Operación no permitida.'}};
 return execute_(action,data,clientId,null);
}
function optativaAdmin(action,data){
 try{
  const actor=requireAdmin_();
  if(action==='session')return {admin:true};
  if(action==='logout')return {ok:true};
  if(!/^admin\./.test(action))return {error:{code:'FORBIDDEN',message:'Operación no permitida.'}};
  return execute_(action,data,'admin',actor);
 }catch(e){return {error:{code:'UNAUTHORIZED',message:'Abre el panel desde la hoja privada con tu cuenta de Google autorizada.'}};}
}
function execute_(action,data,clientId,actor){
 const engine=buildEngine_();
 const cache=CacheService.getScriptCache();
 if(action==='status'){const cached=cache.get('optativa-public-status');if(cached)return JSON.parse(cached);}
 const lock=LockService.getScriptLock();
 // Never wait while consuming all concurrent execution slots.
 if(!lock.tryLock(150))return {error:{code:'BUSY',message:'Hay otras inscripciones en proceso. Espera unos segundos y confirma de nuevo.'}};
 try{
  if(!data||typeof data!=='object'||Array.isArray(data)||JSON.stringify(data).length>600000)throw new engine.DomainError('INVALID','Solicitud no válida.');
  if(!actor&&(!/^[a-zA-Z0-9-]{16,80}$/.test(String(clientId||''))))throw new engine.DomainError('INVALID','Vuelve a abrir la página.');
  const store=createStore_();
  if(action==='status'){const result={config:store.get('config','registration'),groups:store.list('groups')};cache.put('optativa-public-status',JSON.stringify(result),10);return result;}
  if(!actor)engine.limit(store,'global-student',1200);
  const result=engine.dispatch(store,action,data,{actor:actor,ip:clientId});
  store.commit();
  return result;
 }catch(e){
  if(e instanceof engine.DomainError)return {error:{code:e.code,message:e.message}};
  console.error('Optativas error: '+(e.name||'Error'));
  return {error:{code:'INTERNAL',message:'Ha ocurrido un problema. Inténtalo nuevamente. Si persiste, consulta al colegio.'}};
 }finally{lock.releaseLock();}
}
function createStore_(){
 const spreadsheetId=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
 if(!spreadsheetId)throw new Error('Sistema sin preparar.');
 const tab=SpreadsheetApp.openById(spreadsheetId).getSheetByName('REGISTROS');
 if(!tab)throw new Error('Falta REGISTROS.');
 const rows=tab.getLastRow()>1?tab.getRange(2,1,tab.getLastRow()-1,3).getValues():[];
 const records=new Map(),positions=new Map(),pending=new Map();
 rows.forEach((r,i)=>{if(r[0]&&r[1]){const key=r[0]+'\0'+r[1];records.set(key,JSON.parse(r[2]));positions.set(key,i+1);}});
 const clone=x=>x==null?null:JSON.parse(JSON.stringify(x));
 const cache=CacheService.getScriptCache(),cacheWrites=new Map();
 const ephemeral=c=>c==='limits'||c==='tickets';
 let nextRow=rows.length+1;
 const store={
  get:(c,id)=>{if(ephemeral(c)){const key=c+':'+id;const v=cacheWrites.has(key)?cacheWrites.get(key):cache.get(key);return v?JSON.parse(v):null;}return clone(records.get(c+'\0'+id));},
  list:c=>Array.from(records.entries()).filter(([key])=>key.startsWith(c+'\0')).map(([,v])=>clone(v)),
  search:(section,level,prefix)=>store.list('students').filter(s=>s.seccion===section&&s.nivel===level&&s.nombreNormalizado.startsWith(prefix)).sort((a,b)=>a.nombreNormalizado.localeCompare(b.nombreNormalizado)).slice(0,6),
  set:(c,id,value)=>{if(ephemeral(c)){cacheWrites.set(c+':'+id,JSON.stringify(value));return;}const key=c+'\0'+id;records.set(key,clone(value));pending.set(key,{collection:c,id,data:clone(value)});},
  delete:(c,id)=>{const key=c+'\0'+id;records.delete(key);pending.set(key,{collection:c,id,deleted:true});},
  transaction:fn=>fn(store),
  commit:()=>{
   if(!pending.size){cacheWrites.forEach((v,k)=>cache.put(k,v,600));return;}
   const updates=[];
   pending.forEach((value,key)=>{
    const index=positions.has(key)?positions.get(key):nextRow++;
    const values=value.deleted?['','','']:[value.collection,value.id,JSON.stringify(value.data)];
    updates.push({updateCells:{start:{sheetId:tab.getSheetId(),rowIndex:index,columnIndex:0},rows:[{values:values.map(v=>({userEnteredValue:{stringValue:v}}))}],fields:'userEnteredValue'}});
   });
   if(nextRow>tab.getMaxRows())updates.unshift({appendDimension:{sheetId:tab.getSheetId(),dimension:'ROWS',length:nextRow-tab.getMaxRows()}});
   // All student/enrollment/counter/audit changes commit together or none do.
   // Advanced Sheets service must be enabled in appsscript.json.
   Sheets.Spreadsheets.batchUpdate({requests:updates},spreadsheetId);
   cacheWrites.forEach((v,k)=>cache.put(k,v,600));cache.remove('optativa-public-status');pending.clear();
  }
 };
 return store;
}
