@echo off
chcp 65001 >nul
echo ========================================
echo    NewAutoClip 一键打包工具
echo ========================================
echo.

set DIST_NAME=NewAutoClip-Portable
set PROJECT_DIR=%~dp0
set OUTPUT_DIR=%PROJECT_DIR%dist-package

echo [1/4] 清理缓存文件...
echo.

:: 清理 Python 缓存
if exist "%PROJECT_DIR%backend\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\__pycache__"
if exist "%PROJECT_DIR%backend\api\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\api\__pycache__"
if exist "%PROJECT_DIR%backend\api\v1\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\api\v1\__pycache__"
if exist "%PROJECT_DIR%backend\core\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\core\__pycache__"
if exist "%PROJECT_DIR%backend\models\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\models\__pycache__"
if exist "%PROJECT_DIR%backend\services\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\services\__pycache__"
if exist "%PROJECT_DIR%backend\tasks\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\tasks\__pycache__"
if exist "%PROJECT_DIR%backend\utils\__pycache__" rmdir /s /q "%PROJECT_DIR%backend\utils\__pycache__"
for /d /r "%PROJECT_DIR%backend" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d"

:: 清理前端缓存
if exist "%PROJECT_DIR%frontend\node_modules" rmdir /s /q "%PROJECT_DIR%frontend\node_modules"
if exist "%PROJECT_DIR%frontend\dist" rmdir /s /q "%PROJECT_DIR%frontend\dist"
if exist "%PROJECT_DIR%frontend\.vite" rmdir /s /q "%PROJECT_DIR%frontend\.vite"

:: 清理 Tauri 缓存
if exist "%PROJECT_DIR%src-tauri\target" rmdir /s /q "%PROJECT_DIR%src-tauri\target"
if exist "%PROJECT_DIR%src-tauri\gen" rmdir /s /q "%PROJECT_DIR%src-tauri\gen"

:: 清理日志
if exist "%PROJECT_DIR%logs" rmdir /s /q "%PROJECT_DIR%logs"

:: 清理 Python 编译文件
for /r "%PROJECT_DIR%" %%f in (*.pyc *.pyo) do del /q "%%f" 2>nul

:: 清理其他缓存
if exist "%PROJECT_DIR%backend.log" del /q "%PROJECT_DIR%backend.log"
if exist "%PROJECT_DIR%backend_error.log" del /q "%PROJECT_DIR%backend_error.log"
if exist "%PROJECT_DIR%celery.log" del /q "%PROJECT_DIR%celery.log"
if exist "%PROJECT_DIR%dump.rdb" del /q "%PROJECT_DIR%dump.rdb"

echo 完成
echo.

echo [2/4] 创建压缩包...
echo.

:: 创建输出目录
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

:: 复制项目文件（排除大文件和缓存）
powershell -Command "& {Get-ChildItem -Path '%PROJECT_DIR%' -Exclude node_modules,.git,dist,.vite,target,__pycache__,logs,*.log,dump.rdb -Recurse -File | Where-Object {$_.FullName -notmatch 'node_modules|\\.git\\|dist\\|\\.vite\\|target\\|__pycache__|logs'} | Copy-Item -Destination {'%OUTPUT_DIR%' + $_.FullName.Substring('%PROJECT_DIR%'.Length) -replace '\\\\[^\\\\]+$',''} -Force}"

:: 使用 7z 或 powershell 压缩
if exist "%OUTPUT_DIR%\%DIST_NAME%.zip" del /q "%OUTPUT_DIR%\%DIST_NAME%.zip"
powershell -Command "Compress-Archive -Path '%OUTPUT_DIR%\*' -DestinationPath '%OUTPUT_DIR%\%DIST_NAME%.zip' -Force"

echo 完成
echo.

echo [3/4] 创建安装说明...
echo.

:: 创建 README 文件
(
echo ========================================
echo    NewAutoClip 安装说明
echo ========================================
echo.
echo 1. 解压 NewAutoClip-Portable.zip
echo.
echo 2. 安装必要依赖:
echo    - Python 3.8+: https://www.python.org/downloads/
echo    - Node.js 16+: https://nodejs.org/
echo    - FFmpeg: https://ffmpeg.org/download.html
echo.
echo 3. 安装 Python 依赖:
echo    ^> pip install -r requirements.txt
echo.
echo 4. 安装前端依赖:
echo    ^> cd frontend
echo    ^> npm install
echo    ^> cd ..
echo.
echo 5. 配置 AI API 密钥:
echo    启动后在前端设置页面配置 API 密钥
echo.
echo 6. 一键启动 ^(推荐^):
echo    ^> 一键启动.bat
echo.
echo 7. 或手动启动:
echo    - 启动后端: ^> python -m uvicorn backend.main:app --reload --port 8000
echo    - 启动前端: ^> cd frontend && npm run dev
echo.
echo 8. 访问 http://localhost:3000
echo.
) > "%OUTPUT_DIR%\安装说明.txt"

echo 完成
echo.

echo [4/4] 清理临时文件...
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
echo 完成
echo.

echo ========================================
echo    打包完成！
echo ========================================
echo 输出文件: %OUTPUT_DIR%\%DIST_NAME%.zip
echo.
echo 请查看 安装说明.txt 获取安装步骤
echo.
pause
