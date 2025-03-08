@echo off
echo Starting Personalized Question Set Generator System...
echo.

rem Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python not found! Please make sure Python is installed and added to PATH environment variable.
    pause
    exit /b
)

cd backend

rem Check if dependencies are installed with correct versions
python check_dependencies.py
if %errorlevel% equ 1 (
    echo Installing or updating required packages...
    python -m pip install --upgrade pip
    python -m pip install werkzeug==2.0.3
    python -m pip install flask==2.0.1 flask-cors==3.0.10 Flask-Limiter==3.5.0 tenacity==8.2.3
    python -m pip install reportlab==4.3.1 Pillow==11.0.0
    python -m pip install langchain>=0.1.0 langchain-community>=0.0.1 zhipuai>=2.0.1 python-dotenv==1.0.0
) else (
    echo All dependencies are already installed with correct versions, no installation needed
)

echo.
echo Starting Flask service...
echo Service will run at http://localhost:5000
echo Please access this address in your browser
echo.
echo Press Ctrl+C to stop the service
echo.

python app.py

pause 