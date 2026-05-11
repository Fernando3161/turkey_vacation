@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%.." >nul
set "REPO_ROOT=%CD%"
set "VENV_DIR=%REPO_ROOT%\.venv"
set "VENV_PYTHON=%VENV_DIR%\Scripts\python.exe"

if not exist "%VENV_PYTHON%" (
    echo Creating virtual environment at "%VENV_DIR%"

    where python >nul 2>nul
    if not errorlevel 1 (
        python -m venv "%VENV_DIR%"
    ) else (
        where py >nul 2>nul
        if not errorlevel 1 (
            py -3 -m venv "%VENV_DIR%"
        ) else (
            echo Could not find Python. Install Python 3 and make sure python or py is available in PATH.
            popd >nul
            exit /b 1
        )
    )

    if errorlevel 1 (
        echo Failed to create virtual environment.
        popd >nul
        exit /b 1
    )
)

if not exist "%VENV_PYTHON%" (
    echo Virtual environment Python was not found at "%VENV_PYTHON%".
    popd >nul
    exit /b 1
)

call "%VENV_DIR%\Scripts\activate.bat"
if errorlevel 1 (
    echo Failed to activate virtual environment.
    popd >nul
    exit /b 1
)

python -m pip install --upgrade pip
if errorlevel 1 (
    echo Failed to upgrade pip.
    popd >nul
    exit /b 1
)

python -m pip install -r "%REPO_ROOT%\requirements.txt"
if errorlevel 1 (
    echo Failed to install dependencies.
    popd >nul
    exit /b 1
)

python "%SCRIPT_DIR%categorize_pictures.py"
set "EXIT_CODE=%ERRORLEVEL%"

popd >nul
exit /b %EXIT_CODE%
