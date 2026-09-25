import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs';
const strip=s=>s.replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'').replace(/\basync /g,'').replace(/\bawait /g,'');
let service=strip(readFileSync('server/service.mjs','utf8'));
service=service.replace('const hash=s=>createHash(\'sha256\').update(s).digest(\'hex\');',"const hash=s=>Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,s).map(b=>('0'+((b+256)%256).toString(16)).slice(-2)).join('');");
service=service.replace("Promise.all(catalogGroups().map(async", "catalogGroups().map(");
// async was removed above; unwrap the one remaining Promise.all at initialization.
service=service.replace("Promise.all(catalogGroups().map( g=>[g,tx.get('groups',g.id)]))","catalogGroups().map(g=>[g,tx.get('groups',g.id)])");
service=service.replace("Promise.all(catalogGroups().map(g=>[g,tx.get('groups',g.id)]))","catalogGroups().map(g=>[g,tx.get('groups',g.id)])");
const csv=`const Papa={
 parse:(text,opts)=>{try{const rows=Utilities.parseCsv(text);const fields=(rows.shift()||[]).map(opts.transformHeader);const errors=[];const data=rows.filter(r=>r.some(v=>v.trim())).map((r,i)=>{if(r.length!==fields.length)errors.push({row:i,message:'Cantidad de columnas incorrecta.'});return Object.fromEntries(fields.map((k,n)=>[k,r[n]||'']));});return {data,errors,meta:{fields}};}catch(e){return {data:[],errors:[{row:0,message:'CSV inválido.'}],meta:{fields:[]}};}},
 unparse:rows=>{if(!rows.length)return '';const keys=Object.keys(rows[0]);const cell=v=>'"'+String(v??'').replace(/"/g,'""')+'"';return [keys.map(cell).join(','),...rows.map(r=>keys.map(k=>cell(r[k])).join(','))].join('\\r\\n');}
};`;
const engine='// Generated from tested domain/service sources; do not edit.\nfunction buildEngine_(){\nconst randomUUID=()=>Utilities.getUuid();\n'+csv+'\n'+strip(readFileSync('server/catalog.mjs','utf8'))+'\n'+strip(readFileSync('server/domain.mjs','utf8'))+'\n'+service+'\nreturn {dispatch,initialize,limit,DomainError};\n}\n';
if(engine.includes('Promise.all')||engine.includes('await ')||engine.includes('async ')||engine.includes('createHash'))throw new Error('Unexpected asynchronous/server-only code in Apps Script engine.');
mkdirSync('apps-script',{recursive:true});writeFileSync('apps-script/Engine.gs',engine);
if(process.argv.includes('--engine-only'))process.exit(0);
const dir='private/apps-script-build/assets';const entries=readdirSync(dir);
const js=readFileSync(dir+'/'+entries.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const css=readFileSync(dir+'/'+entries.find(f=>f.endsWith('.css')),'utf8');
if(entries.filter(f=>f.endsWith('.js')).length!==1)throw new Error('Apps Script build must be a single self-contained JS file.');
const html='<!doctype html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_top"><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style></head><body><div id="root"></div><script>window.OPTATIVAS_ADMIN=<?!= JSON.stringify(admin) ?>;window.OPTATIVAS_HOME_URL="https://slddarias036-art.github.io/Optativas_8Academy/";</script><script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
writeFileSync('apps-script/App.html',html);console.log('Apps Script listo: Code.gs, Engine.gs, App.html, appsscript.json.');
