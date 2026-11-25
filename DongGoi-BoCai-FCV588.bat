@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ======================================================================
echo  FURUNO FCV-588 — Dong goi HTML Doc lap + Bo cai Windows (.exe)
echo ======================================================================

where node >nul 2>&1
if errorlevel 1 (
  echo [LOI] Can cai dat Node.js 22+ de dong goi bo cai Windows.
  pause
  exit /b 1
)

echo.
echo [1/3] Dong goi tep duy nhat dist\FCV-588-Standalone.html ...
node "%~dp0tools\build_fcv588_standalone.mjs"
if errorlevel 1 (
  echo [LOI] Khong the tao dist\FCV-588-Standalone.html
  pause
  exit /b 1
)

echo.
echo [2/3] Cai dat phu thuoc Electron Builder trong apps\fcv588-electron-p30 ...
call npm --prefix "%~dp0apps\fcv588-electron-p30" install --no-audit --no-fund
if errorlevel 1 (
  echo [LOI] npm install that bai trong apps\fcv588-electron-p30
  pause
  exit /b 1
)

echo.
echo [3/3] Dong goi FCV-588 Portable (.exe) va NSIS Setup Installer (.exe) ...
set "CSC_IDENTITY_AUTO_DISCOVERY=false"
call npm --prefix "%~dp0apps\fcv588-electron-p30" run package:win
if errorlevel 1 (
  echo [LOI] Dong goi Electron Windows that bai.
  pause
  exit /b 1
)

echo.
echo ======================================================================
echo  HOAN TAT DONG GOI FCV-588:
echo   1. dist\FCV-588-Standalone.html
echo   2. dist\electron\FCV-588-Portable-1.0.1-win-x64.exe
echo   3. dist\electron\FCV-588-Setup-1.0.1-win-x64.exe
echo ======================================================================
exit /b 0
