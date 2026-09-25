# Cambio de arquitectura por requisito de costo cero

El usuario pidió alojamiento público en GitHub y posteriormente confirmó «Todo gratis». Firebase Functions requiere Blaze; no se activará. La opción de publicación pasa a GitHub Pages + Supabase Free.

Se conserva React y toda la lógica server-side de validación, búsqueda, importación, exportación y matrícula. Supabase Edge Functions ejecuta esa lógica; Supabase Auth se usa solo para administradores. Los estudiantes siguen sin login.

El adaptador Supabase recoge las versiones de los documentos leídos. PostgreSQL bloquea una fila de coordinación, compara esas versiones y aplica todas las escrituras en una transacción mediante optativa_commit. Si otro solicitante cambió un dato relevante, se vuelve a leer y validar. La clave primaria collection/id impide matrículas duplicadas y un CHECK impide contadores fuera de 0..25. No se hace una escritura sensible desde el navegador.

Las funciones RPC privadas solo pueden ejecutarse con service_role desde el servidor. Se replica en una tabla pública exclusivamente apertura y cupos; RLS permite lectura y prohíbe escritura al navegador. No se replica información estudiantil. La clave service_role jamás se publica.

La protección App Check de Firebase no se traslada automáticamente: se conserva comprobante de selección con caducidad, rate limiting en base compartida, validación de origen y reglas de acceso. CORS no autentica personas ni sustituye protección contra bots. La búsqueda sin credenciales mantiene el riesgo documentado de suplantación.

Supabase Free incluye cuotas; puede pausar proyectos de baja actividad durante siete días. No se añaden tarjetas ni planes pagos. Para inscripciones, el colegio debe verificar que el proyecto esté activo antes de abrirlas. No se promete disponibilidad ilimitada ni se generan pings artificiales para evitar políticas del servicio.

El servidor local SQLite y la alternativa Firebase permanecen disponibles para desarrollo, pero la publicación gratuita predeterminada usa Supabase.
