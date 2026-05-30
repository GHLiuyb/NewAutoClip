@echo off
chcp 65001 >nul
title NewAutoClip 打包工具

echo ========================================
echo    NewAutoClip 一键打包工具
echo ========================================
echo.

set PROJECT_DIR=%~dp0
set OUTPUT_DIR=%PROJECT_DIR%dist-package
set DIST_NAME=NewAutoClip-Portable

echo [1/5] 清理缓存文件...
echo.

:: 清理 Python 缓存
for /d /r "%PROJECT_DIR%backend" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\api" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\core" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\models" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\services" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\tasks" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\utils" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\pipeline" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\repositories" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
for /d /r "%PROJECT_DIR%backend\schemas" %%d in (__pycache__) do @if exist "%%d" rmdir /s /q "%%d" 2>nul

:: 清理前端缓存
if exist "%PROJECT_DIR%frontend\node_modules" rmdir /s /q "%PROJECT_DIR%frontend\node_modules"
if exist "%PROJECT_DIR%frontend\dist" rmdir /s /q "%PROJECT_DIR%frontend\dist"
if exist "%PROJECT_DIR%frontend\.vite" rmdir /s /q "%PROJECT_DIR%frontend\.vite"

:: 清理 Tauri 缓存
if exist "%PROJECT_DIR%src-tauri\target" rmdir /s /q "%PROJECT_DIR%src-tauri\target"
if exist "%PROJECT_DIR%src-tauri\gen" rmdir /s /q "%PROJECT_DIR%src-tauri\gen"

:: 清理日志
if exist "%PROJECT_DIR%logs" rmdir /s /q "%PROJECT_DIR%logs"
if exist "%PROJECT_DIR%data\logs" rmdir /s /q "%PROJECT_DIR%data\logs"

:: 清理 Python 编译文件
for /r "%PROJECT_DIR%" %%f in (*.pyc *.pyo) do del /q "%%f" 2>nul

:: 清理其他缓存
if exist "%PROJECT_DIR%backend.log" del /q "%PROJECT_DIR%backend.log" 2>nul
if exist "%PROJECT_DIR%backend_error.log" del /q "%PROJECT_DIR%backend_error.log" 2>nul
if exist "%PROJECT_DIR%celery.log" del /q "%PROJECT_DIR%celery.log" 2>nul
if exist "%PROJECT_DIR%dump.rdb" del /q "%PROJECT_DIR%dump.rdb" 2>nul

:: 清理用户数据
if exist "%PROJECT_DIR%data\projects" rmdir /s /q "%PROJECT_DIR%data\projects"
if exist "%PROJECT_DIR%data\uploads" rmdir /s /q "%PROJECT_DIR%data\uploads"
if exist "%PROJECT_DIR%data\cache" rmdir /s /q "%PROJECT_DIR%data\cache"
if exist "%PROJECT_DIR%data\autoclip.db" del /q "%PROJECT_DIR%data\autoclip.db" 2>nul
if exist "%PROJECT_DIR%data\settings.json" del /q "%PROJECT_DIR%data\settings.json" 2>nul
if exist "%PROJECT_DIR%data\settings.backup.json" del /q "%PROJECT_DIR%data\settings.backup.json" 2>nul

echo   完成
echo.

echo [2/5] 创建输出目录...
if exist "%OUTPUT_DIR%" rmdir /s /q "%OUTPUT_DIR%"
mkdir "%OUTPUT_DIR%"
echo   完成
echo.

echo [3/5] 复制项目文件...
echo   正在复制...

:: 使用PowerShell复制文件（排除特定目录）
powershell -Command "& {
    $source = '%PROJECT_DIR%'
    $dest = '%OUTPUT_DIR%'
    
    $excludeDirs = @(
        '__pycache__', '.git', '.pytest_cache', 'node_modules', 
        'dist', '.vite', 'target', 'logs', 'cache',
        'backend.log', 'backend_error.log', 'celery.log', 'dump.rdb',
        'data\projects', 'data\uploads', 'data\cache',
        'data\autoclip.db', 'data\settings.json', 'data\settings.backup.json'
    )
    
    $includeExt = @('.py', '.tsx', '.ts', '.jsx', '.js', '.json', '.css', 
                   '.html', '.md', '.txt', '.sh', '.bat', '.yml', '.yaml',
                   '.toml', '.env', '.gitignore', '.dockerignore')
    
    Get-ChildItem -Path $source -Recurse -File | Where-Object {
        $fullPath = $_.FullName
        $relativePath = $fullPath.Substring($source.Length)
        $isExcludeDir = $false
        
        foreach ($dir in $excludeDirs) {
            if ($relativePath -like \"*\$dir\*\" -or $relativePath -like \"\$dir\*\") {
                $isExcludeDir = $true
                break
            }
        }
        
        return -not $isExcludeDir
    } | ForEach-Object {
        $relativePath = $_.FullName.Substring($source.Length)
        $destPath = Join-Path $dest $relativePath
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        Copy-Item $_.FullName -Destination $destPath -Force
    }
    
    Write-Host '   文件复制完成'
}"

echo   完成
echo.

echo [4/5] 创建安装说明...
echo.

:: 创建 README 文件
(
echo ========================================
echo    NewAutoClip 使用说明
echo ========================================
echo.
echo 【简介】
echo NewAutoClip 是一款基于 AI 的视频智能切片工具，
echo 支持批量处理多个视频，自动识别精彩片段。
echo.
echo 【系统要求】
echo - Windows 10/11 (64位)
echo - Python 3.8+
echo - Node.js 16+
echo.
echo 【安装步骤】
echo.
echo 1. 安装 Python ^(如果还没有^)
echo   下载地址: https://www.python.org/downloads/
echo    安装时记得勾选 Add Python to PATH
echo.
echo 2. 安装 Node.js ^(如果还没有^)
echo   下载地址: https://nodejs.org/
echo.
echo 3. 安装 FFmpeg ^(视频处理必需^)
echo    下载地址: https://ffmpeg.org/download.html
echo    或者使用: winget install ffmpeg
echo.
echo 4. 双击运行 [一键启动.bat]
echo.
echo 5. 浏览器自动打开 http://localhost:3000
echo.
echo 【使用方法】
echo.
echo 首页 - 单个视频处理
echo    1. 点击"上传视频"
echo    2. 选择视频文件 ^(支持 mp4, mkv, avi 等^)
echo    3. 可选：上传字幕文件
echo    4. 点击"开始处理"
echo.
echo 批量处理 - 一次处理多个视频
echo    1. 点击顶部导航的"批量处理"
echo    2. 点击"添加视频"选择多个视频
echo    3. 点击"开始处理"
echo    4. 系统会自动一个接一个处理
echo.
echo 【AI 模型配置】
echo.
echo 首次使用需要配置 AI 模型：
echo    1. 点击右上角"设置"
echo    2. 选择 AI 模型提供商 ^(硅基流动推荐^)
echo    3. 输入 API 密钥
echo    4. 选择模型
echo    5. 点击"保存配置"
echo.
echo 【常见问题】
echo.
echo Q: 提示"未找到 Python"
echo A: 确保 Python 已安装并添加到系统 PATH
echo.
echo Q: 提示端口被占用
echo A: 关闭占用 8000 或 3000 端口的程序
echo.
echo Q: AI 处理失败
echo A: 检查 API 密钥是否正确，网络是否正常
echo.
echo ========================================
echo    如果有帮助，请给个 Star！
echo ========================================
) > "%OUTPUT_DIR%\使用说明.txt"

echo   完成
echo.

echo [5/5] 创建压缩包...
if exist "%OUTPUT_DIR%\%DIST_NAME%.zip" del /q "%OUTPUT_DIR%\%DIST_NAME%.zip" 2>nul
powershell -Command "Compress-Archive -Path '%OUTPUT_DIR%\*' -DestinationPath '%OUTPUT_DIR%\%DIST_NAME%.zip' -Force"
echo   完成
echo.

echo ========================================
echo    打包完成！
echo ========================================
echo.
echo   输出文件: %OUTPUT_DIR%\%DIST_NAME%.zip
echo   大小:     ~30-50MB ^(取决于视频数量^)
echo.
echo   请查看 [使用说明.txt] 获取详细使用指南
echo.
echo ========================================
echo.

:: 打开输出目录
explorer "%OUTPUT_DIR%"

pause
