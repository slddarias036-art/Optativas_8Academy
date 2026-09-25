# Optativas · Eight Academy

**Publicación gratuita:** se eligió GitHub Pages + Supabase Free por solicitud del colegio. Consulta [SUPABASE-GRATIS.md](docs/SUPABASE-GRATIS.md). Firebase queda como alternativa opcional y no se activará su facturación.

Aplicación en español para inscripción sin cuenta de estudiante. React, servidor transaccional, Firestore para producción y SQLite para demostración local gratuita. Administración separada en /admin.

## Estado de esta entrega
El colegio solicitó instalación y demostración local porque todavía no tiene un proyecto Firebase. No se ha publicado el sitio ni enviado la nómina a servicios externos. La configuración de producción está preparada y requiere un proyecto propio para desplegar. Firebase Functions requiere Blaze y no se promete operación gratuita ilimitada.

## Inicio rápido local
Requiere Node.js **24** (incluye node:sqlite), npm y un navegador moderno.

1. Desde esta carpeta: `npm install`.
2. `npm run build`.
3. `npm start`, o doble clic en **INICIAR.cmd**.
4. Abre http://127.0.0.1:5173. Administración: http://127.0.0.1:5173/admin.
5. La contraseña local se genera al primer inicio en **private/admin-password.txt**. No está incluida en el código fuente. También puedes definir ADMIN_PASSWORD en un archivo .env basado en .env.example. No compartas ese archivo.
6. Conserva abierta la ventana del servidor mientras usas la app; Ctrl+C la detiene.

No abras index.html directamente: usa INICIAR.cmd. Si hay otra instancia iniciada, se abrirá la aplicación existente.

En el equipo donde se preparó esta entrega ya están instaladas las dependencias. El proyecto usa pnpm con node-linker=hoisted para evitar limitaciones de enlaces de Windows; npm también funciona.

El servidor solo escucha en 127.0.0.1: la demo es para este computador. La aplicación es responsive; para uso simultáneo desde dispositivos del colegio, desplegar la versión Firebase con HTTPS. No exponer el servidor de demo con túneles.

## Nómina proporcionada
Se extrajeron **467 estudiantes** de 21 hojas, usando nivel/paralelo del nombre de la hoja y nombre completo de columna B. No se incorporaron datos familiares. Resumen sin nombres: docs/nomina-resumen.json.

| Nivel | Estudiantes | Cupos |
|---|---:|---:|
| 8vo | 85 | 100 |
| 9no | 79 | 100 |
| 10mo | 66 | 100 |
| 1ero BGU | 101 | 100 |
| 2do BGU | 72 | 100 |
| 3ro BGU | 64 | 100 |

**1ero BGU tiene una persona más que la capacidad.** Con el requisito estricto de 25 por materia no es posible matricular a todos en ese nivel. No se aumentan cupos silenciosamente. El panel lo advierte.

El Excel no separa apellidos/nombres. Se mantiene nombreCompleto y nombreSinSeparar=true; no se inventan apellidos. El CSV exportado incluye los campos solicitados, además de nombre_completo y nombre_sin_separar. Para estos registros originales, apellidos y nombres quedan vacíos hasta disponer de una nómina separada correctamente. La búsqueda por prefijo usa el texto completo original.

Los IDs son deterministas por nivel/paralelo/nombre normalizado; no cambian al reordenar filas. Cambio de curso o nombre requiere revisión de identidad, no reimportación ciega. Un código institucional estable en CSV es preferible.

Regenerar la extracción (Python + openpyxl solo lectura):
```sh
python scripts/extract_roster.py "ruta/listas Actualizadas 11 de Septiembre.xlsx"
npm run import:excel
```
La extracción queda en private/roster.json. Este archivo NO debe publicarse. Si no hay estudiantes, el primer inicio local importa este archivo. Una segunda importación omite códigos existentes.

## Uso estudiantil
Sección → nivel → apellidos (4 caracteres, debounce 350 ms) → seleccionar nombre → materia → confirmar. El buscador devuelve máximo 6 resultados del nivel. Si no aparece un nombre, escribir el primer apellido y verificar el nivel.

Cada estudiante tiene máximo una matrícula. Las cuatro materias tienen 25 cupos por nivel. Colores y texto indican disponibilidad. Actualización en tiempo real mediante SSE local y onSnapshot de Firestore en producción. La confirmación vuelve a comprobar cupos en servidor. Si otra persona toma el último, no se registra nada y se permite elegir otra materia. Finalizar limpia los datos; también hay limpieza tras cinco minutos de inactividad.

## Administración
Ingresar con contraseña local; producción usa Firebase Authentication + claim admin.
- Resumen de todos los niveles, advertencia de capacidad, abrir/cerrar proceso.
- Buscar estudiantes y filtrar sección, nivel, paralelo, materia y pendientes; paginación de 50.
- Gestionar: cambiar materia o liberar matrícula, con contador y auditoría atómicos.
- Registrar un estudiante manualmente.
- Importar CSV con previsualización, errores por fila, duplicados y confirmación.
- Descargar nómina/matrículas, grupos/cupos, resumen por nivel y pendientes.
- Consultar últimas 100 acciones de auditoría.

Plantilla CSV:
```csv
codigo_estudiante,apellidos,nombres,seccion,nivel,paralelo
EST001,GARCÍA LÓPEZ,ANA MARÍA,Básica Superior,8vo,A
EST002,PÉREZ RUIZ,JUAN,Bachillerato,1ero BGU,B
```
Se aceptan secciones visibles o claves basica/bachillerato; niveles exactamente 8vo, 9no, 10mo, 1ero BGU, 2do BGU, 3ro BGU. Máximo 1500 filas/600 KB. Errores bloquean confirmación. Códigos existentes se omiten sin modificar matrículas. La importación es atómica por estudiante, no por todo el archivo; si se interrumpe, reintentar omite lo ya importado.

## Carpetas
```
src/                     React, estilos y cliente API
server/catalog.mjs       Secciones, niveles y materias
server/domain.mjs        Validaciones y matrícula transaccional
server/service.mjs       Búsqueda, administración, importación/exportación
server/sqlite.mjs        Adaptador local persistente
server/firestore.mjs     Adaptador Firestore
server/local.mjs         Servidor local y sesión administrativa
functions/               Cloud Function callable
scripts/                 Extracción, instalación y simulación
tests/                   Pruebas automatizadas
reports/                 Resultados verificables sin datos reales
docs/                    Arquitectura, seguridad y resumen de nómina
private/                 Base, nómina y contraseña; excluido de Git
```

## Transacciones y seguridad
Ver docs/ARQUITECTURA.md y docs/SEGURIDAD.md. Clave única enrollments/{studentId}. Una transacción lee apertura, estudiante, matrícula, comprobante y grupos; luego valida y escribe todos los cambios. La misma lógica se ejecuta en SQLite y Firestore. Los cambios administrativos incluyen auditoría.

Sin login o código individual NO es posible demostrar que quien selecciona un nombre es esa persona. App Check, límites por IP, comprobantes aleatorios y consultas pequeñas reducen abuso; no eliminan suplantación. El colegio debe supervisar la selección o aprobar otra forma de verificación para reducir ese riesgo.

## Pruebas
```sh
npm test
npm run simulate
```
La suite cubre los 10 casos solicitados, normalización, privacidad, cierre, importación, autorización y rollback administrativo. El simulador envía 100 peticiones HTTP simultáneas a un servidor aislado con datos ficticios. Exige 25 éxitos, 75 rechazos por cupo, unicidad y contadores iguales al número real de matrículas de cada grupo. Reporte: reports/concurrency.json. Nunca modifica la nómina local.

Para el emulador, instala Java compatible con Firebase CLI y ejecuta en dos terminales:
```sh
firebase emulators:start --only firestore --project demo-optativas-test
```
En PowerShell, en otra terminal:
```powershell
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
node tests/firestore.emulator.mjs
```
El script solo acepta un emulador local y reinicia datos ficticios del proyecto demo-optativas-test. No ejecutarlo sobre una base que contenga información a conservar.

Consulta docs/VERIFICACION.md para los límites de validación de esta entrega.

Son pruebas locales de SQLite + lógica compartida; **no equivalen a una prueba del backend Firebase desplegado**. Antes de producción ejecutar también las pruebas en Firestore Emulator y preproducción.

## Enlace público mediante GitHub Pages
Consulta [docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md). Las rutas y el workflow están preparados; la publicación requiere conectar GitHub y un backend en línea. La base local no puede compartirse a través de Pages.

## Firebase: instalación y despliegue
1. Crear proyecto propio. Revisar costos y activar Blaze solo con autorización del colegio. Instalar Firebase CLI y autenticar con firebase login.
2. Activar Firestore (modo producción) y Authentication Email/Password solo para administradores. Crear usuario administrador.
3. Registrar aplicación web; copiar su configuración pública en .env con VITE_BACKEND=firebase. Completar todos los VITE_FIREBASE_* y VITE_RECAPTCHA_SITE_KEY.
4. Configurar App Check con reCAPTCHA v3, autorizar dominio y activar enforcement para Firestore. La función exige App Check siempre.
5. Configurar Application Default Credentials de Google Cloud fuera del repositorio y GOOGLE_CLOUD_PROJECT. Crear ADMIN_UID con el UID del administrador.
6. `node scripts/firebase-setup.mjs --roster`: prepara 24 grupos con 25 cupos, configuración cerrada, importa la nómina y asigna claim admin al UID indicado. Cerrar y volver a iniciar sesión tras asignar el rol.
7. `node scripts/prepare-functions.mjs`; instalar dependencias dentro de functions (`npm install --prefix functions`).
8. `npm run build`.
9. `firebase use --add` y elegir proyecto; luego `firebase deploy --only firestore,functions,hosting`.
10. Revisar App Check, índices listos, roles, reglas y dominio; validar en preproducción. Abrir inscripciones desde el panel solo después de la revisión.

Región inicial us-central1; si se cambia, actualizar functions/index.mjs y VITE_FUNCTIONS_REGION juntos. Nunca copiar private dentro de dist o functions. La configuración de hosting solo publica dist.

Las colecciones subjects se representan por el catálogo versionado en código y por datos de groups; cambiar asignaturas requiere cambiar catálogo y migración controlada. El instalador no altera grupos existentes.

fechaInicio/fechaFin están preparadas en configuración y validación server-side; el panel MVP ofrece abrir/cerrar, sin editor de calendario.

## Operación
Respaldar private/optativas.sqlite con el servidor detenido, o usar backup consistente de SQLite. En Firebase habilitar política de backup acorde al colegio y costos autorizados. Ejecutar `node scripts/cleanup.mjs` para temporales locales. Mantener auditoría durante el plazo definido por la institución.

No se incluyen claves privadas ni credenciales reales en el repositorio. La contraseña generada es exclusivamente local y se guarda fuera del código.
