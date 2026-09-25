@echo off
cd /d "%~dp0"
set "APP_NODE=node"
where node >nul 2>nul
if errorlevel 1 (
 if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "APP_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
 ) else (
  echo Instala Node.js 24 LTS y vuelve a abrir este archivo.
  pause
  exit /b 1
 )
)
if not exist node_modules (
 echo Primero ejecuta npm install y npm run build. Consulta README.md.
 pause
 exit /b 1
)
"%APP_NODE%" server/local.mjs --open
pause
