# Google Sheets + Apps Script + GitHub Pages (sin planes de pago)

Arquitectura elegida por el usuario. Supabase/Firebase permanecen como alternativas, pero no son necesarios ni se contratan.

## Qué se publica
- Código y página de entrada: repositorio público de GitHub.
- Formulario React: Apps Script HtmlService, incluido en GitHub mediante iframe.
- Datos: hoja de Google Sheets NUEVA y PRIVADA.
- Administración: menú Optativas en esa hoja, protegido por identidad de Google y lista de administradores.
- Los estudiantes no necesitan iniciar sesión.

## Preparación de la hoja
1. Crear una hoja vacía privada. No compartirla como «cualquier persona con el enlace».
2. Abrir Extensiones > Apps Script.
3. Copiar los archivos del directorio apps-script: Code.gs, Engine.gs y App.html. El archivo HTML debe llamarse App.
4. Activar la visualización del archivo de manifiesto en Configuración del proyecto y pegar appsscript.json. Este activa el servicio avanzado Google Sheets.
5. Ejecutar iniciarOptativas_ desde el editor con la cuenta propietaria. El titular debe revisar y aceptar los permisos de su aplicación; no se necesita tarjeta.
6. Volver a la hoja y recargar. Aparecerá Optativas > Abrir panel administrativo.
7. Importar el archivo privado nomina_para_importar.csv desde el panel. Contiene los 467 nombres y sus cursos, sin familiares. Confirmar después de revisar.
8. Revisar que 1ero BGU tiene 101 estudiantes para 100 cupos. El programa no aumenta el límite de 25.

## Publicación del formulario
1. Apps Script > Implementar > Nueva implementación > Aplicación web.
2. Ejecutar como: la cuenta propietaria.
3. Acceso: cualquier persona, incluidas personas sin cuenta de Google. Una cuenta escolar puede impedir esta opción por políticas del dominio; el colegio debe resolverlo si ocurre.
4. Compartir únicamente la URL que acaba en /exec. La hoja y el proyecto de Apps Script no se hacen públicos.
5. Configurar esa URL como VITE_APPS_SCRIPT_URL en Settings > Secrets and variables > Actions > Variables del repositorio.
6. Ejecutar el workflow de GitHub Pages. El enlace será https://slddarias036-art.github.io/Optativas_8Academy/.
7. Abrir el formulario sin sesión de Google, verificar matrícula con datos de prueba en una copia privada y revisar funcionamiento en móvil antes de abrir el proceso real.
8. Abrir matrículas desde el panel administrativo cuando esté listo.

La URL /dev es de pruebas para editores y NO sirve para estudiantes.

## Administradores
Se autoriza la cuenta que preparó el sistema. Para añadir otro administrador, el propietario configura ADMIN_EMAILS en las propiedades del script, con correos separados por comas, y le concede el acceso necesario a la hoja. No existe contraseña administrativa dentro del código público.

La comprobación usa Session.getActiveUser().getEmail(), nunca getEffectiveUser: en un despliegue que ejecuta como propietario, usar effectiveUser permitiría confundir a un visitante con el dueño.

El botón Salir del panel oculta la información; no cierra la sesión de Google de todo el navegador. En computadores compartidos se debe cerrar también la sesión de Google.

## Consistencia y límites
Cada solicitud que valida o modifica usa ScriptLock. Si está ocupado, se devuelve BUSY y el estudiante debe reintentar; no se reservan plazas en el navegador. Matrícula, estudiante, contador y auditoría se guardan con una sola llamada Sheets.Spreadsheets.batchUpdate: todas las escrituras se aplican juntas o ninguna.

TODOS los cambios deben pasar por el mismo proyecto de Apps Script. No editar REGISTROS manualmente ni desplegar un segundo proyecto independiente contra la misma hoja: el bloqueo no protege cambios manuales ni otros proyectos.

Las búsquedas, comprobantes y límites temporales usan caché del servidor para evitar una escritura en Sheets por consulta. La caché puede expulsar entradas antes de caducar; un comprobante perdido obliga a buscar de nuevo, no permite sobrecupo. El límite por navegador es una mitigación de abuso y puede eludirse cambiando identificador; Apps Script no proporciona aquí una IP verificable del estudiante. Existe además un límite global. No se declara protección completa contra enumeración o suplantación.

Los cupos se consultan cada 15–18 segundos y siempre se comprueban de nuevo al confirmar. No es un canal push en tiempo real. Google impone cuotas de ejecución y de escrituras de Sheets; una demanda concentrada puede requerir reintentos y espaciar las inscripciones. No se prometen 100 escrituras instantáneas.

El formulario se incrusta mediante ALLOWALL para funcionar dentro de GitHub Pages. No contiene acceso administrativo para usuarios anónimos. El riesgo inherente de seleccionar el nombre de otra persona sigue existiendo; supervisar el proceso.

## Generar archivos desde el código fuente
Con Node 24 y dependencias instaladas, compilar con VITE_BACKEND=sheets y VITE_BASE_PATH=./ hacia private/apps-script-build; después ejecutar node scripts/prepare-apps-script.mjs. El generador conserva la lógica del dominio y adapta las operaciones a ejecución síncrona. Engine.gs no se edita a mano.

App.html contiene la interfaz compilada y no contiene nombres de estudiantes ni credenciales. Se puede incluir en el repositorio público. La nómina permanece en private/.

## Validación
tests/apps-script.test.mjs prueba el motor adaptado, bloqueo ocupado, fallo atómico, identidad administrativa, cambio de grupo, importación y límite de 25. Los servicios de Google están simulados; estas pruebas NO son una medición de concurrencia ni cuotas de Apps Script real. Debe completarse la prueba remota después del despliegue.
