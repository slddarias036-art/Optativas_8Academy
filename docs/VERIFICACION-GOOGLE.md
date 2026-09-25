# Validación de la opción Google

Se ejecutó:
- 6 pruebas del adaptador Apps Script con servicios de Google simulados.
- Modelo de 100 intentos: 25 matrículas, 75 rechazos por cupo.
- Bloqueo ocupado: rechaza temporalmente sin escribir.
- Fallo del batch: no quedan matrícula o contador parciales en el modelo.
- Acceso administrativo: usa usuario activo autorizado; visitante no hereda identidad del dueño.
- Cambio de materia: contador de origen, destino y auditoría en un batch.
- Importación con nombre completo original, sin inventar apellidos.
- Compilación de frontend para Apps Script y generación de HTML independiente.

Pendiente:
- Instalar y autorizar Apps Script en la hoja privada creada por el usuario.
- Probar cuentas administrativas y acceso anónimo en el despliegue real.
- Prueba de carga contra Google y validación de sus cuotas.
- Inspección visual del formulario alojado por Google en móvil y escritorio.
- Resolver 101 estudiantes de 1ero BGU para 100 cupos.

Las pruebas del modelo no prueban capacidad de procesar 100 peticiones simultáneas en Google. Se aceptaron actualización periódica de cupos y reintentos por cuotas/bloqueo.
