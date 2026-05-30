"""
事件处理器 - 上传完成后自动触发处理任务
"""

import os
import sys
import time
import logging
from pathlib import Path
from threading import Thread, Event

# 添加项目根目录到Python路径
project_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(project_root))

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

class EventProcessor:
    """事件处理器 - 监听上传完成事件并触发处理"""
    
    def __init__(self):
        self.stop_event = Event()
        self.monitor_thread = None
        self.projects_dir = project_root / "data" / "projects"
        self.processing_projects = set()
        
    def _process_project(self, project_id):
        """处理单个项目"""
        if project_id in self.processing_projects:
            logger.info(f"项目 {project_id} 正在处理中，跳过")
            return
            
        try:
            self.processing_projects.add(project_id)
            logger.info(f"开始处理项目: {project_id}")
            
            from backend.services.simple_progress import emit_progress
            from backend.services.processing_service import ProcessingService
            from backend.core.database import get_session
            
            # 更新进度为处理中
            emit_progress(project_id, "SUBTITLE", "开始处理...", 0)
            
            # 获取项目目录
            project_dir = self.projects_dir / project_id
            raw_dir = project_dir / "raw"
            
            # 查找视频文件
            video_files = list(raw_dir.glob("*.mp4")) + list(raw_dir.glob("*.mkv")) + \
                         list(raw_dir.glob("*.avi")) + list(raw_dir.glob("*.mov"))
            
            if not video_files:
                logger.error(f"项目 {project_id} 没有找到视频文件")
                emit_progress(project_id, "SUBTITLE", "未找到视频文件", 0)
                return
            
            video_path = video_files[0]
            logger.info(f"找到视频文件: {video_path}")
            
            # 检查是否已有SRT文件
            srt_path = raw_dir / f"{video_path.stem}.srt"
            
            # 如果没有SRT文件，先生成字幕
            if not srt_path.exists():
                logger.info("生成字幕...")
                emit_progress(project_id, "SUBTITLE", "生成字幕中...", 25)
                
                try:
                    import whisper
                    model = whisper.load_model("tiny")
                    result = model.transcribe(str(video_path), language="zh", verbose=False)
                    
                    # 保存SRT
                    with open(srt_path, "w", encoding="utf-8") as f:
                        for i, segment in enumerate(result.get("segments", []), 1):
                            start = segment["start"]
                            end = segment["end"]
                            text = segment["text"]
                            
                            hours = int(start // 3600)
                            minutes = int((start % 3600) // 60)
                            secs = int(start % 60)
                            millis = int((start % 1) * 1000)
                            start_time = f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
                            
                            hours = int(end // 3600)
                            minutes = int((end % 3600) // 60)
                            secs = int(end % 60)
                            millis = int((end % 1) * 1000)
                            end_time = f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"
                            
                            f.write(f"{i}\n")
                            f.write(f"{start_time} --> {end_time}\n")
                            f.write(f"{text.strip()}\n\n")
                    
                    logger.info(f"字幕生成成功 ({len(result.get('segments', []))} segments)")
                    emit_progress(project_id, "SUBTITLE", "字幕生成完成", 100)
                except Exception as e:
                    logger.error(f"字幕生成失败: {e}")
                    emit_progress(project_id, "SUBTITLE", f"字幕生成失败: {e}", 0)
                    self.processing_projects.remove(project_id)
                    raise
            
            # 执行完整处理流程
            emit_progress(project_id, "ANALYZE", "开始内容分析...", 0)
            
            try:
                db = next(get_session())
                processing_service = ProcessingService(db)
                result = processing_service.start_processing(project_id, srt_path)
                
                if result.get("success"):
                    emit_progress(project_id, "DONE", "处理完成", 100)
                    logger.info(f"项目 {project_id} 处理成功")
                else:
                    emit_progress(project_id, "EXPORT", "处理失败", 0)
                    logger.error(f"项目 {project_id} 处理失败")
                    
            except Exception as e:
                logger.error(f"处理项目 {project_id} 时出错: {e}")
                emit_progress(project_id, "EXPORT", f"处理失败: {e}", 0)
                raise
                
        finally:
            if project_id in self.processing_projects:
                self.processing_projects.remove(project_id)
    
    def _scan_and_process(self):
        """扫描并处理待处理的项目"""
        if not self.projects_dir.exists():
            return
            
        for project_dir in self.projects_dir.iterdir():
            if not project_dir.is_dir():
                continue
                
            project_id = project_dir.name
            
            # 检查是否是有效的项目目录（包含raw文件夹）
            raw_dir = project_dir / "raw"
            if not raw_dir.exists():
                continue
                
            # 检查是否有视频文件
            video_files = list(raw_dir.glob("*.mp4")) + list(raw_dir.glob("*.mkv")) + \
                         list(raw_dir.glob("*.avi")) + list(raw_dir.glob("*.mov"))
            
            if not video_files:
                continue
                
            # 检查是否已经有处理完成的标志或正在处理
            if project_id in self.processing_projects:
                continue
                
            # 检查是否已有处理结果
            result_dir = project_dir / "clips"
            if result_dir.exists() and len(list(result_dir.glob("*.mp4"))) > 0:
                logger.info(f"项目 {project_id} 已有处理结果，跳过")
                continue
                
            # 检查上传完成标记
            upload_complete = project_dir / "upload_complete"
            if upload_complete.exists():
                logger.info(f"检测到项目 {project_id} 上传完成，开始处理")
                self._process_project(project_id)
    
    def run(self):
        """启动事件监听循环"""
        logger.info("事件处理器已启动")
        
        while not self.stop_event.is_set():
            try:
                self._scan_and_process()
            except Exception as e:
                logger.error(f"扫描过程中出错: {e}")
            
            # 每5秒检查一次（可以根据需要调整）
            self.stop_event.wait(5)
        
        logger.info("事件处理器已停止")
    
    def start(self):
        """启动后台线程"""
        self.monitor_thread = Thread(target=self.run, daemon=True)
        self.monitor_thread.start()
        logger.info("事件处理器后台线程已启动")
    
    def stop(self):
        """停止事件处理器"""
        self.stop_event.set()
        if self.monitor_thread:
            self.monitor_thread.join()
        logger.info("事件处理器已停止")

if __name__ == "__main__":
    processor = EventProcessor()
    processor.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        processor.stop()
        print("事件处理器已停止")