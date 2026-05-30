"""
直接处理任务 - 不依赖 Celery
用于在项目上传完成后同步处理视频
"""

import logging
from pathlib import Path
from typing import Optional
from backend.core.database import get_db
from backend.services.project_service import ProjectService
from backend.services.processing_service import ProcessingService
from backend.services.simple_progress import emit_progress
from backend.utils.thumbnail_generator import generate_project_thumbnail

logger = logging.getLogger(__name__)

def process_import(project_id: str, video_path: str, srt_file_path: Optional[str] = None):
    """
    直接处理导入任务（不依赖 Celery）
    
    Args:
        project_id: 项目ID
        video_path: 视频文件路径
        srt_file_path: 字幕文件路径（可选）
    """
    logger.info(f"开始直接处理导入任务: {project_id}")
    
    try:
        # 获取数据库会话
        db = next(get_db())
        project_service = ProjectService(db)
        processing_service = ProcessingService(db)
        
        # 更新进度
        emit_progress(project_id, "SUBTITLE", "开始处理...", 0)
        
        # 1. 尝试生成缩略图（失败不影响处理）
        logger.info(f"检查项目 {project_id} 缩略图...")
        emit_progress(project_id, "SUBTITLE", "检查缩略图...", 10)
        
        project = project_service.get(project_id)
        if project and not project.thumbnail:
            logger.info(f"项目 {project_id} 没有缩略图，尝试生成...")
            emit_progress(project_id, "SUBTITLE", "生成缩略图...", 12)
            
            try:
                thumbnail_data = generate_project_thumbnail(project_id, Path(video_path))
                if thumbnail_data:
                    project.thumbnail = thumbnail_data
                    db.commit()
                    logger.info(f"项目 {project_id} 缩略图生成成功")
            except Exception as e:
                logger.warning(f"生成项目缩略图时发生错误，跳过: {e}")
        
        # 2. 生成字幕（如果没有提供）
        srt_path = srt_file_path
        
        if not srt_path:
            logger.info(f"开始为项目 {project_id} 生成字幕...")
            emit_progress(project_id, "SUBTITLE", "生成字幕...", 30)
            
            try:
                import whisper
                model = whisper.load_model("tiny")
                result = model.transcribe(video_path, language="zh", verbose=False)
                
                # 保存SRT
                srt_path = Path(video_path).with_suffix(".srt")
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
                
                srt_path = str(srt_path)
                logger.info(f"字幕生成成功: {srt_path} ({len(result.get('segments', []))} segments)")
                emit_progress(project_id, "SUBTITLE", "字幕生成完成", 50)
                
            except Exception as e:
                logger.error(f"字幕生成失败: {e}")
                emit_progress(project_id, "SUBTITLE", f"字幕生成失败: {e}", 0)
                project_service.update_project_status(project_id, "failed")
                return
        
        # 3. 更新项目状态为处理中
        logger.info(f"更新项目 {project_id} 状态为处理中...")
        emit_progress(project_id, "ANALYZE", "开始内容分析...", 0)
        project_service.update_project_status(project_id, "processing")
        
        # 4. 启动完整处理流程
        if srt_path and Path(srt_path).exists():
            try:
                logger.info(f"启动项目 {project_id} 的处理流程...")
                emit_progress(project_id, "ANALYZE", "开始内容分析...", 10)
                
                result = processing_service.start_processing(project_id, Path(srt_path))
                
                if result.get("success"):
                    logger.info(f"项目 {project_id} 处理成功")
                    emit_progress(project_id, "DONE", "处理完成", 100)
                else:
                    logger.error(f"项目 {project_id} 处理失败")
                    emit_progress(project_id, "EXPORT", "处理失败", 0)
                    project_service.update_project_status(project_id, "failed")
                    
            except Exception as e:
                logger.error(f"启动项目 {project_id} 处理失败: {str(e)}")
                emit_progress(project_id, "EXPORT", f"处理失败: {str(e)}", 0)
                project_service.update_project_status(project_id, "failed")
        else:
            logger.error(f"字幕文件不存在: {srt_path}")
            emit_progress(project_id, "EXPORT", "字幕文件不存在", 0)
            project_service.update_project_status(project_id, "failed")
        
        logger.info(f"导入任务完成: {project_id}")
        db.close()
        
    except Exception as e:
        logger.error(f"导入任务失败: {project_id}, 错误: {e}")
        
        try:
            db = next(get_db())
            project_service = ProjectService(db)
            project_service.update_project_status(project_id, "failed")
            emit_progress(project_id, "EXPORT", f"处理失败: {e}", 0)
            db.close()
        except:
            pass
        
        raise
