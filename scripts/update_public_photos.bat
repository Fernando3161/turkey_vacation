@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.." >nul
set "REPO_ROOT=%CD%"
set "PHOTOS_DIR=%REPO_ROOT%\public\photos"
set "PHOTO_MANIFEST=%REPO_ROOT%\public\data\photo-manifest.json"

where node >nul 2>nul
if errorlevel 1 (
    echo Node.js was not found in PATH.
    goto fail
)

where npm >nul 2>nul
if errorlevel 1 (
    echo npm was not found in PATH.
    goto fail
)

if not exist "%REPO_ROOT%\node_modules\@playwright\test\package.json" (
    echo Installing npm dependencies from package-lock.json...
    call npm ci
    if errorlevel 1 goto fail
) else (
    echo npm dependencies already available.
)

echo Refreshing public photo output...
if exist "%PHOTOS_DIR%" (
    rmdir /s /q "%PHOTOS_DIR%"
    if errorlevel 1 goto fail
)

mkdir "%PHOTOS_DIR%" >nul 2>nul
if errorlevel 1 goto fail

if exist "%PHOTO_MANIFEST%" (
    del /q "%PHOTO_MANIFEST%"
    if errorlevel 1 goto fail
)

echo Generating full and thumbnail photos...
call npm run photos:generate
if errorlevel 1 goto fail

echo Generating photo manifests...
call npm run photos:manifest
if errorlevel 1 goto fail

echo Validating day data...
call npm run data:validate
if errorlevel 1 goto fail

echo Validating generated photo assets...
node "%REPO_ROOT%\scripts\validate-photo-assets.js"
if errorlevel 1 goto fail

echo Ensuring Playwright Chromium is installed...
call npx playwright install chromium
if errorlevel 1 goto fail

echo Running website smoke test...
node "%REPO_ROOT%\scripts\smoke-test-website.js"
if errorlevel 1 goto fail

echo.
echo Photo refresh and website verification completed successfully.
popd >nul
exit /b 0

:fail
echo.
echo Photo refresh failed.
popd >nul
exit /b 1
