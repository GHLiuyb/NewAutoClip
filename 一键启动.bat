@echo off
chcp 65001 >nul
title NewAutoClip 一键启动

echo ========================================
echo    NewAutoClip 一键启动
echo ========================================
echo.

:: 检查Python
echo [1/4] 检查Python环境...
python --version >nul 2>&1
if errorlevel 1 (
    echo   [错误] 未找到Python，请先安装 Python 3.8+
    echo   下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)
echo   [OK] Python已安装

:: 检查Node.js
echo.
echo [2/4] 检查Node.js环境...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [错误] 未找到Node.js，请先安装
    echo   下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo   [OK] Node.js已安装

:: 安装Python依赖
echo.
echo [3/4] 安装Python依赖...
pip install -r requirements.txt -q
if errorlevel 1 (
    echo   [错误] Python依赖安装失败
    pause
    exit /b 1
)
echo   [OK] Python依赖安装完成

:: 安装前端依赖
echo.
echo [4/4] 安装前端依赖...
cd frontend
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo   [错误] 前端依赖安装失败
        cd ..
        pause
        exit /b 1
    )
)
cd ..
echo   [OK] 前端依赖安装完成

:: 创建必要目录
echo.
echo [完成] 创建数据目录...
if not exist "data" mkdir data
if not exist "data\projects" mkdir data\projects
if not exist "data\uploads" mkdir data\uploads
if not exist "data\cache" mkdir data\cache
if not exist "data\logs" mkdir data\logs
if not exist "logs" mkdir logs

echo.
echo ========================================
echo    启动服务
echo ========================================
echo.

:: 启动后端
echo   [启动中] 启动后端服务...
start "NewAutoClip-后端" cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0"

:: 等待后端启动
echo   等待后端启动...
timeout /t 8 /nobreak >nul

:: 启动前端
echo   [启动中] 启动前端服务...
start "NewAutoClip-前端" cmd /k "cd /d %~dp0frontend && npm run dev"

:: 等待前端启动
echo   等待前端启动...
timeout /t 10 /nobreak >nul

:: 打开浏览器（使用PowerShell）
echo   [完成] 正在打开浏览器...
powershell -Command "Start-Process 'http://localhost:3000'"

echo.
echo ========================================
echo    服务已启动！
echo ========================================
echo.
echo   后端地址: http://localhost:8000
echo   前端地址: http://localhost:3000
echo.
echo   窗口标题: NewAutoClip-后端 和 NewAutoClip-前端
echo   关闭这两个窗口即可停止服务
echo.
echo ========================================
echo.

:: 自动关闭启动窗口
timeout /t 3 /nobreak >nul
