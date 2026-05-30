from sqlalchemy import Column, String, Integer, Float, DateTime, Text, Enum as SQLEnum
from sqlalchemy.sql import func
import enum
from backend.models.base import Base


class QueueStatus(str, enum.Enum):
    PENDING = "pending"      # 等待中
    PROCESSING = "processing" # 处理中
    COMPLETED = "completed"  # 已完成
    FAILED = "failed"        # 失败
    CANCELLED = "cancelled" # 已取消


class BatchQueue(Base):
    """批量处理队列"""
    __tablename__ = "batch_queue"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    project_name = Column(String(500), nullable=False, comment="项目名称")
    video_path = Column(String(1000), nullable=False, comment="视频文件路径")
    srt_path = Column(String(1000), nullable=True, comment="字幕文件路径")
    
    status = Column(
        SQLEnum(QueueStatus),
        default=QueueStatus.PENDING,
        nullable=False,
        comment="处理状态"
    )
    
    priority = Column(Integer, default=0, comment="优先级，数字越大越优先")
    position = Column(Integer, default=0, comment="队列位置")
    
    error_message = Column(Text, nullable=True, comment="错误信息")
    retry_count = Column(Integer, default=0, comment="重试次数")
    
    progress = Column(Float, default=0.0, comment="当前进度 0-100")
    current_step = Column(String(100), nullable=True, comment="当前步骤")
    
    created_at = Column(DateTime, server_default=func.now(), comment="创建时间")
    started_at = Column(DateTime, nullable=True, comment="开始处理时间")
    completed_at = Column(DateTime, nullable=True, comment="完成时间")
    
    project_id = Column(Integer, nullable=True, comment="关联的项目ID")
    
    metadata_json = Column(Text, nullable=True, comment="额外元数据JSON")

    def to_dict(self):
        return {
            "id": self.id,
            "project_name": self.project_name,
            "video_path": self.video_path,
            "srt_path": self.srt_path,
            "status": self.status.value if self.status else None,
            "priority": self.priority,
            "position": self.position,
            "error_message": self.error_message,
            "retry_count": self.retry_count,
            "progress": self.progress,
            "current_step": self.current_step,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "project_id": self.project_id,
        }


class BatchQueueStats(Base):
    """批量处理统计"""
    __tablename__ = "batch_queue_stats"

    id = Column(Integer, primary_key=True, autoincrement=True)
    
    total_count = Column(Integer, default=0, comment="总任务数")
    pending_count = Column(Integer, default=0, comment="等待中")
    processing_count = Column(Integer, default=0, comment="处理中")
    completed_count = Column(Integer, default=0, comment="已完成")
    failed_count = Column(Integer, default=0, comment="失败")
    
    current_processing_id = Column(Integer, nullable=True, comment="当前处理的队列ID")
    
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
