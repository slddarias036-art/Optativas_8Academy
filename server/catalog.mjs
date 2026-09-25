export const levels = {basica:['8vo','9no','10mo'],bachillerato:['1ero BGU','2do BGU','3ro BGU']};
export const sections = {basica:'Básica Superior',bachillerato:'Bachillerato'};
export const subjects = [
 {id:'multimedia',nombre:'Multimedia y CC',secciones:['basica'],descripcion:'Cuenta historias con fotografía, video y contenido digital.',icon:'Camera',color:'blue'},
 {id:'robotica_ia',nombre:'Robótica IA',secciones:['basica'],descripcion:'Construye, programa y explora la inteligencia artificial.',icon:'Bot',color:'orange'},
 {id:'personal_branding',nombre:'Personal Branding',secciones:['basica','bachillerato'],descripcion:'Descubre tu identidad y comunica lo que te hace único.',icon:'Sparkles',color:'purple'},
 {id:'produccion_musical',nombre:'Producción Musical',secciones:['basica'],descripcion:'Transforma tus ideas en ritmos, sonidos y canciones.',icon:'Music',color:'pink'},
 {id:'video_mapping',nombre:'Video Mapping',secciones:['bachillerato'],descripcion:'Dale vida a los espacios con luz y proyecciones.',icon:'Projector',color:'blue'},
 {id:'no_code',nombre:'Programación No Code',secciones:['bachillerato'],descripcion:'Crea aplicaciones y soluciones sin escribir código.',icon:'Blocks',color:'orange'},
 {id:'diseno_grafico',nombre:'Diseño Gráfico',secciones:['bachillerato'],descripcion:'Convierte tus ideas en imágenes que comunican.',icon:'PenTool',color:'pink'}
];
export const normalize = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
export const groupId = (nivel,subjectId) => `${nivel.replace(/ /g,'_')}_${subjectId}`;
export const catalogGroups = () => Object.entries(levels).flatMap(([seccion,ns])=>ns.flatMap(nivel=>subjects.filter(s=>s.secciones.includes(seccion)).map(s=>({id:groupId(nivel,s.id),subjectId:s.id,nombre:s.nombre,seccion,nivel,cupoMaximo:25,inscritos:0}))));
