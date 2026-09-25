# Seguridad y límites operativos

## Estudiantes
No se usa Firebase Authentication. Buscar el nombre no acredita identidad: otra persona que conozca apellidos puede seleccionarlo. Este riesgo es inherente al requisito. Para lanzamiento real, el colegio debe definir supervisión y un proceso de corrección administrativa.

Búsqueda server-side por prefijo normalizado, sección y nivel; mínimo 4 caracteres, máximo 6 coincidencias. Los resultados no contienen teléfonos, correos o cédulas. Comprobante aleatorio UUID de 10 minutos vinculado a estudiante/nivel/sección, verificado nuevamente al matricular. No se publican colecciones privadas y no se persiste la nómina en navegador. Una matrícula duplicada, un cupo lleno o un ID inválido abortan toda la transacción.

Se limita la búsqueda a 120/minuto/IP y el tráfico general a 240/minuto/IP, matrícula 150/minuto/IP. Ajustar con pruebas de la red del colegio: muchos dispositivos comparten IP. El límite usa contador transaccional en base compartida entre instancias. Es una mitigación, no una solución completa contra bots distribuidos.

## Firebase
Funciones callable con enforceAppCheck=true y Authentication solo para administradores. Claim admin se asigna mediante script de confianza, no desde la interfaz. Activar App Check para Firestore en la consola también. SDK Admin ignora reglas por diseño: toda autorización y validación está en la API. Clientes solo leen groups y config/registration; todas las escrituras directas están prohibidas, incluso para administradores.

Aplicar IAM de mínimo privilegio y no compartir cuentas administrativas. Nunca subir private, .env ni credenciales de servicio. Application Default Credentials para tareas de instalación. Los valores VITE de configuración web son públicos; nunca deben contener claves privadas.

## Sesión local
Demo exclusivamente 127.0.0.1. Contraseña aleatoria generada en private/admin-password.txt o ADMIN_PASSWORD; cookie HttpOnly SameSite=Strict, caduca a una hora; límite de intentos. Validación Host/Origin y Content-Type contra peticiones de otros sitios. No sirve para exponer por túnel, LAN o Internet; usar Firebase HTTPS para esa finalidad.

El archivo privado de contraseña se protege con los permisos de la cuenta de Windows; no compartir el directorio private. La sesión queda solo en memoria y se invalida al reiniciar.

## Privacidad y operaciones
Excel original contiene datos de representantes: no se copian. La extracción lee A:B solamente. Se conserva nombre completo sin adivinar su separación. Los datos reales quedan en private/ ignorado por Git y fuera de dist. Finalizar limpia el estado en pantalla, y cinco minutos de inactividad también lo limpia.

Exportaciones CSV neutralizan celdas que comienzan con =, +, -, @ para evitar fórmulas ejecutables. Los logs de errores no incluyen cargas de estudiantes. Auditoría de cambios administrativos se guarda junto con la operación.

Tickets y rate limits caducados se purgan con scripts/cleanup.mjs (ejecutar periódicamente). No se elimina auditoría automáticamente; definir retención con el colegio. Respaldar antes de cambios masivos. No editar manualmente contadores en consola.

## Validación pendiente para producción
La suite local y el simulador HTTP verifican lógica y atomicidad SQLite. Repetir sobre Firestore Emulator y proyecto de preproducción antes del lanzamiento; no se afirma rendimiento de producción a partir de pruebas locales. Revisar cuotas/costos, configuración App Check, reglas, roles, calendario y 101 estudiantes de 1ero BGU para 100 plazas.
