# Registro público sin planes de pago

Destino: https://slddarias036-art.github.io/Optativas_8Academy/
Repositorio: https://github.com/slddarias036-art/Optativas_8Academy

## Servicios
- GitHub Pages: frontend público.
- Supabase Free: PostgreSQL, Edge Functions, Auth de administradores y Realtime.
- Estudiantes: sin login, búsqueda de nómina y transacción server-side.
- Ninguna tarjeta, mejora de plan o servicio pago se necesita para esta configuración. Se aplican cuotas y posibles pausas por baja actividad del plan Free.

## Crear y conectar el proyecto
1. El titular crea una cuenta/proyecto en https://supabase.com/dashboard y elige organización Free. No seleccionar Pro ni introducir tarjeta.
2. Guardar la contraseña de base de datos de forma privada. No incluirla en GitHub ni compartirla en el chat.
3. Obtener Project URL y Publishable key (o anon key heredada). Son configuración pública del cliente. Nunca usar service_role como variable VITE.
4. Instalar Supabase CLI según su documentación. Iniciar sesión con supabase login y enlazar con supabase link --project-ref REFERENCIA.
5. Revisar y aplicar la migración: supabase db push. Crea esquema privado, restricciones, RPC solo para servidor, tabla pública de cupos con RLS y Realtime.
6. Ejecutar node scripts/prepare-supabase.mjs y supabase functions deploy optativas. verify_jwt=false es intencional para estudiantes sin cuenta; cada acción administrativa verifica el JWT y app_metadata.role=admin dentro de la función.
7. Crear un usuario administrativo en Authentication > Users. Deshabilitar el alta pública de nuevos usuarios en Authentication. El frontend no ofrece registro de cuentas.
8. Para inicialización privada, crear .env.supabase (ignorado por Git) con SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y ADMIN_UID. Ejecutar node scripts/supabase-setup.mjs --roster. Crea 24 grupos y estado cerrado, importa la nómina y asigna el rol administrativo. Eliminar la clave del entorno cuando no sea necesaria. No publicar este archivo.
9. En el repositorio GitHub > Settings > Secrets and variables > Actions > Variables, añadir VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY.
10. En Settings > Pages elegir GitHub Actions. Ejecutar el workflow Publicar interfaz en GitHub Pages.
11. Revisar app pública, seguridad, búsqueda, concurrencia y contador en preproducción. Abrir matrículas desde el panel cuando todo esté listo.

La función permite por defecto el origen https://slddarias036-art.github.io. Para otro dominio cambiar ALLOWED_ORIGIN en los secretos de Edge Functions. Las claves de servidor son secretos de Supabase, no de Pages.

## Sin proyecto configurado
El sitio puede publicarse en estado «Inscripciones en preparación». No descarga la nómina ni permite matricular. Tener un enlace visible no equivale a disponer de registro en línea operativo.

## Límites
Asegurar que el proyecto no esté pausado antes de abrir matrículas. Revisar consumo durante el período. No se contrata automáticamente un plan pago al llegar a las cuotas. Respaldar y exportar conforme a la política del colegio.

## Validación
La suite local prueba las reglas compartidas. Los tests de Supabase ejecutan el SQL en PostgreSQL embebido PGlite con registros ficticios y validan transacciones, conflictos, permisos y capacidad. Esto no mide latencia, cuotas ni comportamiento del servicio Supabase remoto; repetir pruebas antes de abrir el registro público.

## Datos reales
La nómina de 467 estudiantes permanece en private/ y solo se carga de forma privada al proyecto del colegio. 1ero BGU tiene 101 estudiantes y 100 plazas; resolver ese cupo faltante antes de exigir matrícula a todo el nivel.
