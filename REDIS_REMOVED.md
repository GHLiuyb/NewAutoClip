# Redis 依赖已移除说明

## 概述
NewAutoClip 现已完全移除 Redis 和 Celery 依赖，使用 SQLite + asyncio 实现所有功能。

## 移除内容

### 1. 依赖文件 (requirements.txt)
- 移除 `celery[redis]`
- 移除 `redis`

### 2. 功能替代方案

| 原功能 | 原技术栈 | 新技术栈 |
|--------|----------|----------|
| 单个视频处理 | Celery + Redis | threading (后台线程) |
| 批量队列处理 | Celery + Redis | SQLite + asyncio |
| 进度通知 | WebSocket | HTTP 轮询 (已简化) |

## 现有功能
- ✅ 单个视频处理 (使用 `direct_process.py`)
- ✅ 批量处理 (使用 `batch_processor.py`)
- ✅ 项目管理
- ✅ 配置管理
- ✅ 所有其他原有功能

## 启动方式
```bash
# 一键启动
一键启动.bat

# 或手动启动
python -m uvicorn backend.main:app --reload --port 8000
cd frontend && npm run dev
```

## 部署环境要求
- ✅ Python 3.8+
- ✅ Node.js 16+
- ✅ FFmpeg
- ❌ 不需要 Redis!
- ❌ 不需要 Celery!
