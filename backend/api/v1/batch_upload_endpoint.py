@router.post("/upload-batch")
async def upload_batch_files(
    video_files: List[UploadFile] = File(...),
    video_category: Optional[str] = Form(None),
    project_service: ProjectService = Depends(get_project_service)
):
    """批量上传视频文件，每个视频创建一个独立项目。"""
    try:
        if not video_files:
            raise HTTPException(status_code=400, detail="请至少选择一个视频文件")
        
        # 验证所有视频文件类型
        for video_file in video_files:
            if not video_file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv', '.webm')):
                raise HTTPException(status_code=400, detail=f"文件 {video_file.filename} 格式不支持")
        
        results = []
        errors = []
        
        # 处理每个视频文件
        for video_file in video_files:
            try:
                logger.info(f"开始处理视频文件: {video_file.filename}")
                
                # 项目名称使用视频文件名（去掉扩展名）
                project_name = video_file.filename.replace('.mp4', '').replace('.avi', '').replace('.mov', '').replace('.mkv', '').replace('.webm', '')
                
                # 创建项目数据
                project_data = ProjectCreate(
                    name=project_name,
                    description=f"Video: {video_file.filename}, Subtitle: Whisper自动生成",
                    project_type=ProjectType.KNOWLEDGE,
                    status=ProjectStatus.PENDING,
                    source_url=None,
                    source_file=video_file.filename,
                    settings={
                        "video_category": video_category or "knowledge",
                        "video_file": video_file.filename,
                        "srt_file": "Whisper自动生成"
                    }
                )
                
                # 创建项目
                project = project_service.create_project(project_data)
                project_id = str(project.id)
                
                # 保存文件到项目目录
                from ...core.path_utils import get_project_raw_directory
                raw_dir = get_project_raw_directory(project_id)
                
                # 保存视频文件
                video_path = raw_dir / "input.mp4"
                content = await video_file.read()
                with open(video_path, "wb") as f:
                    f.write(content)
                
                # 更新项目的视频路径
                project.video_path = str(video_path)
                project_service.db.commit()
                
                # 立即生成缩略图（同步处理）
                try:
                    from ...utils.thumbnail_generator import generate_project_thumbnail
                    logger.info(f"开始为项目 {project_id} 生成缩略图...")
                    thumbnail_data = generate_project_thumbnail(project_id, video_path)
                    if thumbnail_data:
                        project.thumbnail = thumbnail_data
                        project_service.db.commit()
                        logger.info(f"项目 {project_id} 缩略图生成成功")
                except Exception as e:
                    logger.error(f"生成项目缩略图时发生错误: {e}")
                
                # 启动后台处理线程
                import threading
                
                def run_processing(proj_id, vid_path):
                    try:
                        from ...tasks.direct_process import process_import
                        process_import(
                            project_id=proj_id,
                            video_path=str(vid_path),
                            srt_file_path=None
                        )
                    except Exception as e:
                        logger.error(f"处理项目 {proj_id} 时出错: {e}")
                
                process_thread = threading.Thread(target=run_processing, args=(project_id, video_path), daemon=True)
                process_thread.start()
                logger.info(f"项目 {project_id} 处理任务已启动")
                
                results.append({
                    "success": True,
                    "project_id": project_id,
                    "project_name": project_name,
                    "video_file": video_file.filename
                })
                
            except Exception as e:
                logger.exception(f"处理文件 {video_file.filename} 失败")
                errors.append({
                    "success": False,
                    "video_file": video_file.filename,
                    "error": str(e)
                })
        
        return {
            "total": len(video_files),
            "success": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("批量上传失败")
        raise HTTPException(status_code=500, detail=f"批量上传失败: {str(e)}")
