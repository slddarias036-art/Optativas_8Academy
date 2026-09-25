import {createClient} from '@supabase/supabase-js';import {readFileSync} from 'node:fs';import {SupabaseStore} from '../server/supabase.mjs';import {initialize,importStudents} from '../server/service.mjs';
try{process.loadEnvFile('.env.supabase');}catch{}
const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!url||!key)throw new Error('Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.supabase privado. Nunca usar service_role en VITE.');
const client=createClient(url,key,{auth:{persistSession:false}}),store=new SupabaseStore(client);await initialize(store);
if(process.argv.includes('--roster'))console.log(await importStudents(store,JSON.parse(readFileSync('private/roster.json','utf8')),'instalacion-supabase'));
if(process.env.ADMIN_UID){const {data,error}=await client.auth.admin.getUserById(process.env.ADMIN_UID);if(error)throw error;const result=await client.auth.admin.updateUserById(process.env.ADMIN_UID,{app_metadata:{...data.user.app_metadata,role:'admin'}});if(result.error)throw result.error;console.log('Permiso de administrador asignado.');}
