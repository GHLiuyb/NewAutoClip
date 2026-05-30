    def _cleanup_project_progress(self, project_id: str):
        """
        清理项目相关的进度数据
        
        Args:
            project_id: 项目ID
        """
        try:
            # 清理增强进度服务中的缓存（如果还存在）
            try:
                from ..services.enhanced_progress_service import progress_service
                if project_id in progress_service.progress_cache:
                    del progress_service.progress_cache[project_id]
                    logger.info(f"清理项目 {project_id} 的内存进度缓存")
            except Exception as e:
                logger.warning(f"清理内存进度缓存失败: {e}")
            
        except Exception as e:
            logger.error(f"清理项目进度数据失败: {str(e)}")