#!/usr/bin/env python3
"""
清理无效的项目记录
当手动删除了 data/projects 目录下的文件但数据库中还有记录时使用
"""

import sys
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# 添加项目根目录到路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

try:
    from backend.core.database import SessionLocal
    from backend.models.project import Project
    from backend.models.task import Task
    from backend.models.clip import Clip
    from backend.models.collection import Collection
except Exception as e:
    logger.error(f"导入模块失败: {e}")
    sys.exit(1)


def cleanup_invalid_projects():
    """清理无效的项目记录"""
    db = SessionLocal()
    try:
        logger.info("开始检查无效项目...")
        
        # 获取所有项目
        projects = db.query(Project).all()
        logger.info(f"数据库中共有 {len(projects)} 个项目")
        
        invalid_projects = []
        
        for project in projects:
            project_id = str(project.id)
            project_dir = Path(f"data/projects/{project_id}")
            
            # 检查项目目录是否存在
            if not project_dir.exists():
                logger.warning(f"项目 {project_id} ({project.name}) 的目录不存在，标记为无效")
                invalid_projects.append(project)
        
        if not invalid_projects:
            logger.info("没有发现无效项目")
            return
        
        logger.info(f"发现 {len(invalid_projects)} 个无效项目，开始清理...")
        
        for project in invalid_projects:
            project_id = str(project.id)
            logger.info(f"正在清理项目 {project_id}: {project.name}")
            
            try:
                # 开始事务
                if not db.in_transaction():
                    db.begin()
                
                # 删除相关任务
                task_count = db.query(Task).filter(Task.project_id == project_id).count()
                if task_count > 0:
                    db.query(Task).filter(Task.project_id == project_id).delete()
                    logger.info(f"  - 删除 {task_count} 个任务")
                
                # 删除相关切片
                clip_count = db.query(Clip).filter(Clip.project_id == project_id).count()
                if clip_count > 0:
                    db.query(Clip).filter(Clip.project_id == project_id).delete()
                    logger.info(f"  - 删除 {clip_count} 个切片")
                
                # 删除相关合集
                collection_count = db.query(Collection).filter(Collection.project_id == project_id).count()
                if collection_count > 0:
                    db.query(Collection).filter(Collection.project_id == project_id).delete()
                    logger.info(f"  - 删除 {collection_count} 个合集")
                
                # 删除项目记录
                db.query(Project).filter(Project.id == project_id).delete()
                logger.info(f"  - 删除项目记录")
                
                # 提交事务
                db.commit()
                logger.info(f"项目 {project_id} 清理成功")
                
            except Exception as e:
                db.rollback()
                logger.error(f"清理项目 {project_id} 失败: {e}")
        
        logger.info("清理完成")
        
    except Exception as e:
        logger.error(f"清理过程中发生错误: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    cleanup_invalid_projects()
