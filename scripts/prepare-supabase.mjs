import {mkdirSync,copyFileSync} from 'node:fs';
const dir='supabase/functions/optativas/shared';mkdirSync(dir,{recursive:true});
for(const file of ['catalog.mjs','domain.mjs','service.mjs','supabase.mjs'])copyFileSync('server/'+file,dir+'/'+file);
console.log('Edge Function preparada con la misma lógica de validación y matrícula.');
