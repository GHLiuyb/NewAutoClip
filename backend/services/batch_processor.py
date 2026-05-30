"""
批量处理服务
使用 asyncio 实现后台任务处理，无需 Redis/Celery
"""

import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable
from sqlalchemy.orm import Session

from backend.models.batch_queue import BatchQueue, BatchQueueStats, QueueStatus
from backend.core.database import SessionLocal
from backend.services.exceptions import ProcessingError

logger = logging.getLogger(__name__)


class BatchProcessor:
    """批量处理器 - 使用 asyncio 实现后台处理"""
    
    _instance: Optional['BatchProcessor'] = None
    
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self._processing_lock = asyncio.Lock()
        self._progress_callbacks = []
    
    @classmethod
    def get_instance(cls) -> 'BatchProcessor':
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def add_progress_callback(self, callback: Callable):
        """添加进度回调函数"""
        if callback not in self._progress_callbacks:
            self._progress_callbacks.append(callback)
    
    def remove_progress_callback(self, callback: Callable):
        """移除进度回调函数"""
        if callback in self._progress_callbacks:
            self._progress_callbacks.remove(callback)
    
    async def notify_progress(self, queue_item: BatchQueue, progress: float, step: str = ""):
        """通知进度更新"""
        for callback in self._progress_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(queue_item, progress, step)
                else:
                    callback(queue_item, progress, step)
            except Exception as e:
                logger.error(f"进度回调执行失败: {e}")
    
    async def start(self):
        """启动后台处理循环"""
        if self._running:
            logger.warning("BatchProcessor 已在运行中")
            return
        
        self._running = True
        self._task = asyncio.create_task(self._process_loop())
        logger.info("BatchProcessor 已启动")
    
    async def stop(self):
        """停止后台处理"""
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("BatchProcessor 已停止")
    
    async def _process_loop(self):
        """主处理循环"""
        while self._running:
            try:
                await self._process_next()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"处理循环异常: {e}")
            
            await asyncio.sleep(1)
    
    async def _process_next(self):
        """处理下一个任务"""
        async with self._processing_lock:
            db = SessionLocal()
            try:
                queue_item = self._get_next_pending(db)
                
                if not queue_item:
                    return
                
                queue_item.status = QueueStatus.PROCESSING
                queue_item.started_at = datetime.now()
                queue_item.progress = 0.0
                db.commit()
                
                logger.info(f"开始处理队列任务: {queue_item.id} - {queue_item.project_name}")
                
                try:
                    await self._process_single(db, queue_item)
                except Exception as e:
                    logger.error(f"处理任务失败: {e}")
                    queue_item.status = QueueStatus.FAILED
                    queue_item.error_message = str(e)
                    queue_item.completed_at = datetime.now()
                    db.commit()
            finally:
                db.close()
    
    def _get_next_pending(self, db: Session) -> Optional[BatchQueue]:
        """获取下一个待处理任务"""
        return db.query(BatchQueue).filter(
            BatchQueue.status == QueueStatus.PENDING
        ).order_by(
            BatchQueue.priority.desc(),
            BatchQueue.position.asc(),
            BatchQueue.created_at.asc()
        ).first()
    
    async def _process_single(self, db: Session, queue_item: BatchQueue):
        """处理单个视频"""
        from backend.services.processing_service import ProcessingService
        from backend.models.project import Project, ProjectStatus
        
        try:
            await self.notify_progress(queue_item, 5, "准备中...")
            
            video_path = Path(queue_item.video_path)
            if not video_path.exists():
                raise FileNotFoundError(f"视频文件不存在: {queue_item.video_path}")
            
            await self.notify_progress(queue_item, 10, "创建项目中...")
            
            project = Project(
                name=queue_item.project_name,
                video_path=str(video_path),
                status=ProjectStatus.PROCESSING
            )
            db.add(project)
            db.commit()
            db.refresh(project)
            
            queue_item.project_id = project.id
            db.commit()
            
            await self.notify_progress(queue_item, 15, "开始处理...")
            
            processing_service = ProcessingService(db)
            srt_path = Path(queue_item.srt_path) if queue_item.srt_path else None
            
            result = await asyncio.to_thread(
                processing_service.start_processing,
                project.id,
                srt_path or Path("")
            )
            
            project.status = ProjectStatus.COMPLETED
            db.commit()
            
            queue_item.status = QueueStatus.COMPLETED
            queue_item.progress = 100.0
            queue_item.completed_at = datetime.now()
            db.commit()
            
            await self.notify_progress(queue_item, 100, "完成")
            logger.info(f"任务完成: {queue_item.id} - {queue_item.project_name}")
            
        except Exception as e:
            queue_item.status = QueueStatus.FAILED
            queue_item.error_message = str(e)
            queue_item.completed_at = datetime.now()
            db.commit()
            raise
    
    async def _update_progress(self, queue_item_id: int, progress: float, step: str):
        """更新进度"""
        db = SessionLocal()
        try:
            queue_item = db.query(BatchQueue).filter(
                BatchQueue.id == queue_item_id
            ).first()
            
            if queue_item:
                queue_item.progress = progress
                queue_item.current_step = step
                db.commit()
                
                await self.notify_progress(queue_item, progress, step)
        finally:
            db.close()
    
    def get_queue_stats(self) -> dict:
        """获取队列统计信息"""
        db = SessionLocal()
        try:
            total = db.query(BatchQueue).count()
            pending = db.query(BatchQueue).filter(
                BatchQueue.status == QueueStatus.PENDING
            ).count()
            processing = db.query(BatchQueue).filter(
                BatchQueue.status == QueueStatus.PROCESSING
            ).count()
            completed = db.query(BatchQueue).filter(
                BatchQueue.status == QueueStatus.COMPLETED
            ).count()
            failed = db.query(BatchQueue).filter(
                BatchQueue.status == QueueStatus.FAILED
            ).count()
            
            current = db.query(BatchQueue).filter(
                BatchQueue.status == QueueStatus.PROCESSING
            ).first()
            
            return {
                "total": total,
                "pending": pending,
                "processing": processing,
                "completed": completed,
                "failed": failed,
                "current": current.to_dict() if current else None
            }
        finally:
            db.close()
    
    def get_queue_list(self, status: str = None, limit: int = 100) -> list:
        """获取队列列表"""
        db = SessionLocal()
        try:
            query = db.query(BatchQueue)
            
            if status:
                query = query.filter(BatchQueue.status == QueueStatus(status))
            
            items = query.order_by(
                BatchQueue.priority.desc(),
                BatchQueue.position.asc()
            ).limit(limit).all()
            
            return [item.to_dict() for item in items]
        finally:
            db.close()


batch_processor = BatchProcessor.get_instance()
