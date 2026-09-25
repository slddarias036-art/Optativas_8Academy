# Publicación mediante GitHub Pages

Se eligió GitHub Pages + Supabase Free para respetar la petición «Todo gratis».
Guía vigente: [SUPABASE-GRATIS.md](SUPABASE-GRATIS.md).

Repositorio: https://github.com/slddarias036-art/Optativas_8Academy
URL prevista: https://slddarias036-art.github.io/Optativas_8Academy/

## Preparación realizada
- Rutas compatibles con subcarpetas de GitHub Pages.
- Administración en ?admin=1, sin 404 al recargar.
- Workflow manual que prueba, compila y publica solo dist.
- Configuración pública Supabase mediante variables de GitHub.
- Si ambas variables de Supabase faltan, se publica un estado de preparación que NO permite matrículas.
- Si falta solo una variable o se detecta clave de servidor, se bloquea el build.
- Nómina, SQLite, credenciales y contraseña local no forman parte del repositorio.

## Publicar
1. Settings > Pages: GitHub Actions.
2. Actions > Publicar interfaz en GitHub Pages > Run workflow.
3. Para activar el servicio, seguir la guía Supabase y configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
4. Revisar seguridad, concurrencia y datos en el servicio remoto antes de abrir el proceso.

La interfaz pública y el registro funcional son estados distintos: no abrir inscripciones hasta que el backend esté configurado y verificado.
