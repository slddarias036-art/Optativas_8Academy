# Publicación gratuita mediante GitHub Pages

La opción elegida es **GitHub Pages + Google Sheets privado + Apps Script**.
Guía vigente: [GOOGLE-SHEETS.md](GOOGLE-SHEETS.md).

Repositorio: https://github.com/slddarias036-art/Optativas_8Academy
Página: https://slddarias036-art.github.io/Optativas_8Academy/

El workflow usa VITE_BACKEND=sheets y la variable pública VITE_APPS_SCRIPT_URL.
Hasta que esa URL /exec esté configurada, la página muestra «Inscripciones en preparación» y no registra estudiantes.

El titular crea una hoja privada e instala los cuatro archivos de apps-script. Después despliega como aplicación web, ejecutada por el propietario y accesible sin login para estudiantes. Solo comparte el enlace /exec; la hoja no es pública.

GitHub Actions ejecuta las pruebas, compila y publica únicamente dist. La nómina, claves y contraseña local quedan fuera del repositorio. El frontend puede incrustar Apps Script o abrirlo en otra pestaña si el navegador impide el iframe.
