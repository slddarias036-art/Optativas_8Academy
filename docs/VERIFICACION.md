# Verificación de la entrega

## Ejecutado
- Extracción de 21 hojas del Excel: 467 estudiantes, sin duplicados exactos detectados dentro de curso/paralelo/nombre.
- 16 pruebas automatizadas del dominio, HTTP, sesión administrativa, importación/exportación y actualización SSE: PASS.
- Simulación de 100 peticiones HTTP concurrentes al mismo grupo: 25 éxitos, 75 rechazos por cupo, cero sobrecupos. Se verifica cada uno de los 24 grupos y la correspondencia contador/matrículas.
- Compilación Vite para demostración local: PASS.
- Compilación Vite con modo Firebase: PASS (advertencia de tamaño del módulo Firestore, no error).
- Inspección visual de la pantalla inicial de escritorio: realizada antes de la interrupción del navegador.

## Pendiente
- Recorrido visual completo de estudiante y administrador, navegación por teclado y comprobación visual a 390 px / 768 px. La revisión automática del navegador bloqueó la navegación al entorno de pruebas; no se declara validación visual completa.
- Firestore Emulator: script preparado en tests/firestore.emulator.mjs, no ejecutado (Java no disponible en este entorno).
- Firebase desplegado: no probado ni publicado; no hay proyecto del colegio configurado.
- Revisar la insuficiencia de un cupo en 1ero BGU.
- Separación oficial de apellidos/nombres del Excel si se requiere que esos campos exportados estén completos.

La demostración no sustituye una validación de preproducción. No se modificó ninguna matrícula real durante las pruebas.
