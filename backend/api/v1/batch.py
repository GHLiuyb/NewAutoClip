"""
批量处理 API
无需 Redis/Celery，使用 SQLite 队列
"""

import os
import asyncio
import logging
from typing import List, Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.core.database import get_db, SessionLocal
from backend.models.batch_queue import BatchQueue, QueueStatus
from backend.services.batch_processor import batch_processor

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/batch", tags=["批量处理"])


class VideoItem(BaseModel):
    """视频项"""
    video_path: str = Field(..., description="视频文件路径")
    project_name: Optional[str] = Field(None, description="项目名称，默认使用文件名")
    srt_path: Optional[str] = Field(None, description="字幕文件路径")
    priority: int = Field(0, description="优先级")


class AddToQueueRequest(BaseModel):
    """添加到队列请求"""
    videos: List[VideoItem] = Field(..., description="视频列表")


class QueueItemResponse(BaseModel):
    """队列项响应"""
    id: int
    project_name: str
    video_path: str
    status: str
    progress: float
    current_step: Optional[str]
    error_message: Optional[str]
    created_at: Optional[str]
    started_at: Optional[str]
    completed_at: Optional[str]


class QueueStatsResponse(BaseModel):
    """队列统计响应"""
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    current: Optional[QueueItemResponse]


@router.post("/queue", response_model=dict)
async def add_to_queue(request: AddToQueueRequest, db: Session = Depends(get_db)):
    """添加视频到处理队列"""
    added_items = []
    
    position = db.query(BatchQueue).count()
    
    for i, video in enumerate(request.videos):
        project_name = video.project_name or os.path.splitext(
            os.path.basename(video.video_path)
        )[0]
        
        queue_item = BatchQueue(
            project_name=project_name,
            video_path=video.video_path,
            srt_path=video.srt_path,
            priority=video.priority,
            position=position + i,
            status=QueueStatus.PENDING
        )
        db.add(queue_item)
        added_items.append(queue_item)
    
    db.commit()
    
    for item in added_items:
        db.refresh(item)
    
    return {
        "success": True,
        "message": f"已添加 {len(added_items)} 个视频到队列",
        "items": [item.to_dict() for item in added_items]
    }


@router.get("/queue/stats", response_model=QueueStatsResponse)
async def get_queue_stats():
    """获取队列统计信息"""
    return batch_processor.get_queue_stats()


@router.get("/queue", response_model=List[QueueItemResponse])
async def get_queue_list(
    status: Optional[str] = None,
    limit: int = 100
):
    """获取队列列表"""
    return batch_processor.get_queue_list(status=status, limit=limit)


@router.delete("/queue/{item_id}")
async def remove_from_queue(item_id: int, db: Session = Depends(get_db)):
    """从队列中移除项目"""
    item = db.query(BatchQueue).filter(BatchQueue.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="队列项不存在")
    
    if item.status == QueueStatus.PROCESSING:
        raise HTTPException(
            status_code=400,
            detail="正在处理中的任务无法移除"
        )
    
    db.delete(item)
    db.commit()
    
    return {"success": True, "message": "已从队列中移除"}


@router.delete("/queue")
async def clear_queue(status: Optional[str] = None, db: Session = Depends(get_db)):
    """清空队列"""
    query = db.query(BatchQueue)
    
    if status:
        query = query.filter(BatchQueue.status == QueueStatus(status))
    else:
        query = query.filter(
            BatchQueue.status.in_([
                QueueStatus.PENDING,
                QueueStatus.COMPLETED,
                QueueStatus.FAILED
            ])
        )
    
    count = query.delete()
    db.commit()
    
    return {"success": True, "message": f"已清空 {count} 个队列项"}


@router.post("/start")
async def start_batch_processing():
    """启动批量处理"""
    if batch_processor._running:
        return {"success": True, "message": "批量处理已在运行中"}
    
    await batch_processor.start()
    return {"success": True, "message": "批量处理已启动"}


@router.post("/stop")
async def stop_batch_processing():
    """停止批量处理"""
    if not batch_processor._running:
        return {"success": True, "message": "批量处理已停止"}
    
    await batch_processor.stop()
    return {"success": True, "message": "正在停止批量处理..."}


@router.get("/status")
async def get_batch_status():
    """获取批量处理状态"""
    return {
        "running": batch_processor._running,
        "total_pending": batch_processor.get_queue_stats()["pending"],
        "total_processing": batch_processor.get_queue_stats()["processing"]
    }


@router.post("/upload-and-add")
async def upload_and_add_to_queue(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    srt_files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db)
):
    """上传视频文件并添加到队列"""
    import shutil
    from pathlib import Path
    
    data_dir = Path(__file__).parent.parent.parent / "data" / "uploads"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    uploaded_items = []
    
    for i, file in enumerate(files):
        file_path = data_dir / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        srt_path = None
        if srt_files and i < len(srt_files):
            srt_file = srt_files[i]
            srt_path = data_dir / srt_file.filename
            with open(srt_path, "wb") as buffer:
                shutil.copyfileobj(srt_file.file, buffer)
        
        project_name = os.path.splitext(file.filename)[0]
        
        position = db.query(BatchQueue).count()
        queue_item = BatchQueue(
            project_name=project_name,
            video_path=str(file_path),
            srt_path=str(srt_path) if srt_path else None,
            position=position,
            status=QueueStatus.PENDING
        )
        db.add(queue_item)
        db.commit()
        db.refresh(queue_item)
        uploaded_items.append(queue_item)
    
    return {
        "success": True,
        "message": f"已上传 {len(uploaded_items)} 个视频到队列",
        "items": [item.to_dict() for item in uploaded_items]
    }
