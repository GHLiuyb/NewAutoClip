#!/usr/bin/env python3
"""
AutoClip 一键启动器 v2.2
自动启动所有服务并保存详细日志 - 已移除 Redis 依赖
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path
from datetime import datetime

# 添加项目根目录到Python路径
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))

# 自动添加 FFmpeg 到 PATH
ffmpeg_path = r"C:\ffmpeg\bin"
if ffmpeg_path not in os.environ["PATH"]:
    os.environ["PATH"] = ffmpeg_path + os.pathsep + os.environ["PATH"]

class AutoClipLauncher:
    """AutoClip一键启动器"""
    
    def __init__(self):
        self.processes = []
        self.running = True
        self.db_path = project_root / "data" / "autoclip.db"
        self.event_processor = None
        self.log_file = None
        
        # 创建日志文件
        log_dir = project_root / "data" / "logs"
        log_dir.mkdir(exist_ok=True)
        self.log_file = open(log_dir / f"autoclip_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log", "w", encoding="utf-8")
    
    def log(self, message):
        """记录日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        formatted = f"[{timestamp}] {message}"
        print(formatted)
        self.log_file.write(formatted + "\n")
        self.log_file.flush()
    
    def print_banner(self):
        print("\n" + "=" * 60)
        print("  AutoClip 一键启动器 v2.2")
        print("  自动启动服务 + 详细日志记录 (无 Redis)")
        print("=" * 60 + "\n")
    
    def _find_npm_path(self):
        """查找npm的绝对路径"""
        npm_paths = [
            "C:\\Program Files\\nodejs\\npm.cmd",
            "C:\\Program Files (x86)\\nodejs\\npm.cmd",
            os.path.expanduser("~\\AppData\\Roaming\\npm\\npm.cmd"),
        ]
        
        for npm_path in npm_paths:
            if os.path.exists(npm_path):
                return npm_path
        
        try:
            result = subprocess.run(["where", "npm"], capture_output=True, text=True)
            if result.returncode == 0 and result.stdout:
                return result.stdout.strip().split('\n')[0]
        except:
            pass
        
        return None
    
    def _kill_port_process(self, port):
        """杀死占用指定端口的进程"""
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True
            )
            lines = result.stdout.split('\n')
            for line in lines:
                if f':{port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    if parts:
                        pid = parts[-1]
                        try:
                            subprocess.run(
                                ["taskkill", "/F", "/PID", pid],
                                capture_output=True
                            )
                            self.log(f"已终止占用端口 {port} 的进程 (PID: {pid})")
                            return True
                        except:
                            pass
        except:
            pass
        return False
    
    def start_backend(self):
        """启动后端服务"""
        self.log("检查端口占用...")
        self._kill_port_process(8000)
        self._kill_port_process(3000)
        self.log("正在启动后端服务...")
        
        try:
            # 设置桌面模式环境变量
            env = os.environ.copy()
            env["AUTOCLIP_DESKTOP_MODE"] = "true"
            env["AUTOCLIP_MODE"] = "desktop"
            
            cmd = [
                sys.executable, "-m", "uvicorn", "backend.main:app",
                "--reload", "--port", "8000", "--host", "127.0.0.1"
            ]
            
            process = subprocess.Popen(
                cmd, cwd=str(project_root),
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                bufsize=1, universal_newlines=True,
                env=env  # 使用包含桌面模式变量的环境
            )
            
            self.processes.append(("Backend", process))
            self.log(f"✓ 后端服务已启动 (PID: {process.pid})")
            
            # 等待服务启动
            time.sleep(3)
            
            # 读取并记录初始日志
            self._log_backend_output(process)
            
            return True
        except Exception as e:
            self.log(f"✗ 后端服务启动失败: {e}")
            return False
    
    def _log_backend_output(self, process):
        """记录后端输出"""
        try:
            import threading
            
            def read_output():
                try:
                    if process.stdout:
                        for line in process.stdout:
                            if line.strip():
                                self.log(f"[BACKEND] {line.strip()}")
                except:
                    pass
            
            thread = threading.Thread(target=read_output, daemon=True)
            thread.start()
        except:
            pass
    
    def start_frontend(self):
        """启动前端服务"""
        self.log("正在启动前端服务...")
        
        frontend_dir = project_root / "frontend"
        
        if not frontend_dir.exists():
            self.log("✗ 前端目录不存在")
            return False
        
        npm_path = self._find_npm_path()
        if not npm_path:
            self.log("✗ npm 未找到，请安装 Node.js")
            return False
        
        try:
            cmd = [npm_path, "run", "dev"]
            process = subprocess.Popen(
                cmd, cwd=str(frontend_dir),
                stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                bufsize=1, universal_newlines=True
            )
            
            self.processes.append(("Frontend", process))
            self.log(f"✓ 前端服务已启动 (PID: {process.pid})")
            
            # 等待服务启动
            time.sleep(3)
            
            # 记录前端输出
            self._log_frontend_output(process)
            
            return True
        except Exception as e:
            self.log(f"✗ 前端服务启动失败: {e}")
            return False
    
    def _log_frontend_output(self, process):
        """记录前端输出"""
        try:
            import threading
            
            def read_output():
                try:
                    if process.stdout:
                        for line in process.stdout:
                            if line.strip():
                                self.log(f"[FRONTEND] {line.strip()}")
                    if process.stderr:
                        for line in process.stderr:
                            if line.strip():
                                self.log(f"[FRONTEND ERROR] {line.strip()}")
                except:
                    pass
            
            thread = threading.Thread(target=read_output, daemon=True)
            thread.start()
        except:
            pass
    
    def start_event_processor(self):
        """启动事件处理器"""
        self.log("正在启动事件处理器...")
        
        try:
            from backend.services.event_processor import EventProcessor
            self.event_processor = EventProcessor()
            self.event_processor.start()
            self.log("✓ 事件处理器已启动")
            return True
        except Exception as e:
            self.log(f"✗ 事件处理器启动失败: {e}")
            return False
    
    def signal_handler(self, signum, frame):
        self.log("接收到停止信号，正在关闭服务...")
        self.running = False
        self.stop_all()
        sys.exit(0)
    
    def stop_all(self):
        """停止所有服务"""
        self.log("正在停止所有服务...")
        
        # 停止事件处理器
        if self.event_processor:
            try:
                self.event_processor.stop()
                self.log("事件处理器已停止")
            except:
                pass
        
        # 停止其他进程
        for name, process in reversed(self.processes):
            if process.poll() is None:
                try:
                    process.terminate()
                    process.wait(timeout=5)
                    self.log(f"{name} 已停止")
                except:
                    try:
                        process.kill()
                        self.log(f"{name} 已强制停止")
                    except:
                        pass
        
        # 关闭日志文件
        if self.log_file:
            self.log_file.close()
        
        self.log("所有服务已停止")
    
    def run(self):
        """运行启动器"""
        try:
            self.print_banner()
            
            signal.signal(signal.SIGINT, self.signal_handler)
            signal.signal(signal.SIGTERM, self.signal_handler)
            
            backend_ok = self.start_backend()
            frontend_ok = self.start_frontend()
            processor_ok = self.start_event_processor()
            
            print("\n" + "=" * 60)
            print("  所有服务启动完成！")
            print("=" * 60)
            print("\n访问地址:")
            print("   前端界面: http://localhost:3000")
            print("   后端API:  http://127.0.0.1:8000")
            print("\n日志文件位置:")
            print(f"   {project_root / 'data' / 'logs'}")
            print("\n按 Ctrl+C 停止所有服务")
            print("=" * 60 + "\n")
            
            self.log("所有服务启动完成！")
            self.log("访问地址: http://localhost:3000")
            
            # 打开浏览器
            self.log("正在打开浏览器...")
            import webbrowser
            time.sleep(2)  # 给前端服务多一点启动时间
            webbrowser.open('http://localhost:3000')
            self.log("浏览器已打开")
            
            # 保持脚本运行并持续记录日志
            try:
                while self.running:
                    time.sleep(1)
            except KeyboardInterrupt:
                self.signal_handler(None, None)
            
        except Exception as e:
            self.log(f"错误: {e}")
            import traceback
            traceback.print_exc()
            input("\n按 Enter 键退出...")
            self.stop_all()
            sys.exit(1)

def main():
    launcher = AutoClipLauncher()
    launcher.run()

if __name__ == "__main__":
    main()