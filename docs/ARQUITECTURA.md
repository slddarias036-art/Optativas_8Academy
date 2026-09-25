# Decisiones previas a implementación

1. React con Vite, API del servidor y Firestore en producción. Firebase Hosting sirve solamente dist. Authentication únicamente para administradores con claim admin. App Check obligatorio en funciones callable.
2. Demostración local solicitada: Node 24 + SQLite persistente, escucha exclusiva en 127.0.0.1. No es un servidor para publicar en Internet. SQLite serializa transacciones y comparte la misma lógica de dominio con el adaptador Firestore. No se usan localStorage ni datos de nómina en el bundle.
3. Cada matrícula usa como clave el ID del estudiante. La transacción lee configuración, estudiante, matrícula y grupos antes de escribir. Valida catálogo, nivel, sección, capacidad y unicidad. Los cambios administrativos escriben auditoría en la misma transacción.
4. La búsqueda exige sección/nivel y al menos 4 caracteres, prefijo normalizado e índice compuesto, máximo 6 resultados, debounce 350 ms. La selección requiere un comprobante aleatorio de búsqueda con caducidad de 10 minutos. El comprobante limita manipulación de IDs; NO acredita identidad.
5. Sin credencial estudiantil es imposible impedir completamente la suplantación o enumeración lenta. Rate limiting, App Check y resultados mínimos reducen abuso pero no demuestran identidad. Para mayor protección se necesitaría código individual o supervisión presencial, fuera del flujo solicitado.
6. Solo grupos y estado de apertura son públicos. Datos de estudiantes, matrículas, auditoría y sesiones son exclusivos del servidor. Nunca se importan teléfonos, correos de familiares ni otras columnas del Excel.
7. Excel: curso/paralelo de la hoja, nombre completo de columna B, filas con ordinal numérico en A. ID determinista por nivel, paralelo y nombre normalizado. No se adivina la división de apellidos/nombres; se señala para revisión. CSV permite campos separados. Reimportación no sobrescribe estudiantes ni matrículas existentes.
8. Firebase Cloud Functions requiere Blaze. No se configura facturación ni despliegue sin un proyecto del colegio. Desarrollo local sin cargos; no se garantiza costo cero de producción.

## Modelo
- students/{id}: codigo_estudiante, apellidos, nombres, nombreCompleto, nombreNormalizado, seccion, nivel, paralelo, matriculado, materiaAsignada, fechaMatricula, nombreSinSeparar.
- subjects/{id}: nombre y secciones permitidas (Personal Branding compartida).
- groups/{nivel_subject}: subjectId, nombre, seccion, nivel, cupoMaximo=25, inscritos.
- enrollments/{studentId}: studentId, subjectId, groupId, seccion, nivel, fechaRegistro.
- config/registration: registrationOpen, fechaInicio, fechaFin.
- audit/{uuid}: fecha, administrador, accion, estudiante, anterior, nuevo.
- tickets/{token}: studentId, seccion, nivel, expiresAt; solo servidor.
- limits/{hash}: ventana y solicitudes; solo servidor.

## Fases y validación
Requisitos/decisiones → dominio transaccional → API → flujo estudiantil → administración → seguridad → pruebas funcionales → 100 solicitudes HTTP concurrentes → documentación/despliegue preparado. Los resultados locales no equivalen a probar Firestore en producción.
