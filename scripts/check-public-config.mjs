const backend=process.env.VITE_BACKEND;
if(backend==='supabase'){
 const url=process.env.VITE_SUPABASE_URL?.trim(),key=process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
 if(!url&&!key){console.log('Publicación en preparación: las inscripciones quedarán deshabilitadas hasta conectar Supabase.');process.exit(0);}
 if(!url||!key)throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY conjuntamente.');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw new Error('URL pública Supabase inválida.');
 if(key.startsWith('sb_secret_'))throw new Error('Una clave secreta NO puede publicarse.');
 if(key.split('.').length===3){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role==='service_role')throw new Error('SERVICE_ROLE');}catch(e){if(e.message==='SERVICE_ROLE')throw new Error('service_role NO puede publicarse.');}}
 console.log('Configuración pública Supabase presente; verificar backend antes de abrir matrículas.');
}else if(backend==='firebase'){
 const required=['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_APP_ID','VITE_RECAPTCHA_SITE_KEY'];
 const missing=required.filter(key=>!process.env[key]?.trim());if(missing.length)throw new Error('Faltan variables: '+missing.join(', '));
}else throw new Error('No se puede publicar el servidor local en GitHub Pages.');
