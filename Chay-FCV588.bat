@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"

set "STANDALONE_HTML=%~dp0dist\FCV-588-Standalone.html"

if not exist "%STANDALONE_HTML%" (
  where node >nul 2>&1
  if not errorlevel 1 (
    echo [FCV-588] Dang tao tep doc lap dist\FCV-588-Standalone.html ...
    node "%~dp0tools\build_fcv588_standalone.mjs"
  )
)

if exist "%STANDALONE_HTML%" (
  set "FILE_URI=file:///%STANDALONE_HTML:\=/%"
  setlocal EnableDelayedExpansion
  set "FILE_URI=!FILE_URI: =%%20!"
  for /f "delims=" %%U in ("!FILE_URI!") do (
    endlocal
    set "FILE_URI=%%U"
  )
  call :find_browser
  if defined BROWSER_EXE (
    echo [FCV-588] Mo cua so ung dung doc lap FURUNO FCV-588 ...
    start "" "%BROWSER_EXE%" --app="%FILE_URI%" --window-size=1450,920
    exit /b 0
  )
  echo [FCV-588] Mo dist\FCV-588-Standalone.html bang trinh duyet mac dinh ...
  start "" "%STANDALONE_HTML%"
  exit /b 0
)

where node >nul 2>&1
if not errorlevel 1 (
  echo [FCV-588] Khoi dong may chu cuc bo http://127.0.0.1:4173 ...
  start "" "http://127.0.0.1:4173"
  node "%~dp0tools\server.mjs"
  exit /b %errorlevel%
)

echo [LOI] Khong tim thay dist\FCV-588-Standalone.html hoac Node.js.
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
