import {readFileSync,writeFileSync,readdirSync,statSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';import {spawnSync} from 'node:child_process';
const repo='slddarias036-art/Optativas_8Academy',dir='private/github-publish';mkdirSync(dir,{recursive:true});
let sequence=0;
function gh(args,input){
 const file=join(dir,'request-'+(++sequence)+'.json');if(input!==undefined){writeFileSync(file,JSON.stringify(input));args=[...args,'--input',file];}
 const r=spawnSync('gh',args,{encoding:'utf8',windowsHide:true});if(r.status!==0)throw new Error(r.stderr.trim()||'GitHub CLI failed');
 return r.stdout.trim()?JSON.parse(r.stdout):null;
}
const allowedFiles=['.env.example','.gitignore','.npmrc','INICIAR.cmd','README.md','firebase.json','firestore.indexes.json','firestore.rules','index.html','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','vite.config.js'];
const allowedDirs=['src','server','docs','tests','reports','.github','supabase','functions','scripts'];
const forbidden=['node_modules','.temp','shared'];
function walk(path){return readdirSync(path).flatMap(name=>{if(forbidden.includes(name))return [];const p=join(path,name);if(p.replaceAll('\\','/').startsWith('functions/server'))return [];return statSync(p).isDirectory()?walk(p):[p];});}
const paths=[...allowedFiles,...allowedDirs.flatMap(p=>existsSync(p)?walk(p):[])].map(p=>p.replaceAll('\\','/'));
if(paths.some(p=>p.startsWith('private/')||/\.sqlite|\.xlsx|admin-password|^\.env(?!\.example$)/.test(p)))throw new Error('Private file in publication plan');
const tree=paths.map(path=>({path,mode:'100644',type:'blob',content:readFileSync(path,'utf8')}));
writeFileSync(join(dir,'manifest.json'),JSON.stringify(paths,null,2));
if(!process.argv.includes('--publish')){console.log(JSON.stringify({repository:repo,files:paths.length,manifest:join(dir,'manifest.json'),bytes:tree.reduce((n,x)=>n+Buffer.byteLength(x.content),0)},null,2));process.exit(0);}
const metadata=gh(['api','repos/'+repo]);if(metadata.full_name!==repo||metadata.private)throw new Error('Unexpected repository identity/visibility');
let branch=metadata.default_branch||'main',head;
try{head=gh(['api','repos/'+repo+'/git/ref/heads/'+branch]);}
catch(e){
 let contents;try{contents=gh(['api','repos/'+repo+'/contents']);}catch(checkError){if(!checkError.message.includes('404')||metadata.size!==0)throw checkError;contents=[];}
 if(!Array.isArray(contents)||contents.length)throw e;
 const init=gh(['api','repos/'+repo+'/contents/README.md','--method','PUT'],{message:'Initialize Optativas Eight Academy',content:Buffer.from(readFileSync('README.md','utf8')).toString('base64'),branch});
 head=gh(['api','repos/'+repo+'/git/ref/heads/'+branch]);
}
const parent=head.object.sha,commit=gh(['api','repos/'+repo+'/git/commits/'+parent]);
const newTree=gh(['api','repos/'+repo+'/git/trees','--method','POST'],{base_tree:commit.tree.sha,tree});
if(newTree.sha===commit.tree.sha){console.log(JSON.stringify({repository:repo,unchanged:true,sha:parent}));process.exit(0);}
const next=gh(['api','repos/'+repo+'/git/commits','--method','POST'],{message:'Build free enrollment app with Supabase and GitHub Pages',tree:newTree.sha,parents:[parent]});
const current=gh(['api','repos/'+repo+'/git/ref/heads/'+branch]);
if(current.object.sha!==parent)throw new Error('Remote branch changed; no ref was overwritten. Inspect and retry.');
gh(['api','repos/'+repo+'/git/refs/heads/'+branch,'--method','PATCH'],{sha:next.sha,force:false});
console.log(JSON.stringify({repository:repo,branch,files:tree.length,sha:next.sha,url:'https://github.com/'+repo+'/commit/'+next.sha},null,2));
