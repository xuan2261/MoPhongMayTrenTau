@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "STANDALONE_HTML=%~dp0dist\MDC-2060-Standalone.html"

if not exist "%STANDALONE_HTML%" (
  where node >nul 2>&1
  if not errorlevel 1 (
    echo [MDC-2060] Dang tao tep doc lap dist\MDC-2060-Standalone.html ...
    node "%~dp0tools\build_mdc2060_standalone.mjs"
  )
)

if not exist "%STANDALONE_HTML%" goto :fallback_server

set "FILE_URI=file:///%STANDALONE_HTML:\=/%"
setlocal EnableDelayedExpansion
set "FILE_URI=!FILE_URI:%%=%%25!"
set "FILE_URI=!FILE_URI:#=%%23!"
set "FILE_URI=!FILE_URI: =%%20!"
for /f "delims=" %%U in ("!FILE_URI!") do (
  endlocal
  set "FILE_URI=%%U"
)
call :find_browser
if defined BROWSER_EXE (
  echo [MDC-2060] Mo cua so ung dung doc lap KODEN MDC-2060 ...
  start "" "%BROWSER_EXE%" --app="%FILE_URI%" --window-size=1450,920
  exit /b 0
)
echo [MDC-2060] Mo dist\MDC-2060-Standalone.html bang trinh duyet mac dinh ...
start "" "%STANDALONE_HTML%"
exit /b 0

:fallback_server
where node >nul 2>&1
if errorlevel 1 goto :missing_runtime
echo [MDC-2060] Khoi dong may chu cuc bo http://127.0.0.1:4173/mdc2060 ...
start "" "http://127.0.0.1:4173/mdc2060"
node "%~dp0tools\server.mjs"
exit /b %errorlevel%

:missing_runtime
echo [LOI] Khong tim thay dist\MDC-2060-Standalone.html hoac Node.js.
pause
exit /b 1

:find_browser
set "BROWSER_EXE="
for %%P in (
  "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
  "%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
  "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
  "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
  "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
  if exist "%%~P" (
    set "BROWSER_EXE=%%~P"
    goto :eof
  )
)
goto :eof
