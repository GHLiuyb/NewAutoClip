# NewAutoClip

![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.8+-green?style=flat&logo=python)
![React](https://img.shields.io/badge/React-18+-blue?style=flat&logo=react)

## 🤖 推荐模型

**强烈推荐使用硅基流动的 Qwen/Qwen2.5-14B-Instruct 模型**！

👉 [点此注册送 16 元体验金（约可处理 1000 分钟视频）](https://cloud.siliconflow.cn/i/ygitVHwX)

**优势**:
- ✅ 支持长上下文，理解能力强
- ✅ 处理速度快，性价比高
- ✅ 16 元体验金可处理约 1000 分钟视频
- ✅ 无需科学上网

---

## 功能特性

- 🎬 **多平台支持**: B站/YouTube视频下载，支持本地文件上传
- 🤖 **多AI模型支持**: 支持阿里通义千问、硅基流动、OpenAI、Gemini、商汤日日新等多个AI服务提供商
- ✂️ **智能切片**: AI自动识别精彩片段并切割
- 📚 **智能合集**: AI推荐和手动创建视频合集
- 🚀 **实时处理**: 异步任务队列，实时进度反馈
- 🎨 **现代界面**: React + TypeScript + Ant Design
- 🔐 **配置持久化**: 完善的设置保存和加载机制
- 📦 **批量处理**: 支持批量处理多个视频，自动顺序执行
- 🗄️ **无Redis依赖**: 使用SQLite实现本地任务队列，无需额外安装

## 快速开始

### 环境要求

- Python 3.8+
- Node.js 16+
- FFmpeg (视频处理)

### 安装步骤

#### 方式一：一键启动（推荐）

```bash
# 克隆项目
git clone https://github.com/GHLiuyb/NewAutoClip.git
cd NewAutoClip

# Windows 用户双击运行
一键启动.bat

# 或手动运行
python 一键启动.py
```

#### 方式二：手动启动

```bash
# 克隆项目
git clone https://github.com/GHLiuyb/NewAutoClip.git
cd NewAutoClip

# 安装后端依赖
pip install -r requirements.txt

# 安装前端依赖
cd frontend
npm install
cd ..

# 启动后端
python -m uvicorn backend.main:app --reload --port 8000

# 启动前端 (新终端)
cd frontend
npm run dev
```

## 配置说明

首次运行需要配置AI服务的API密钥。在设置页面配置：

1. **选择AI模型提供商**: 通义千问 / 硅基流动 / OpenAI / Gemini / 商汤日日新
2. **输入API密钥**: 从对应服务商获取
3. **选择模型**: 根据提供商选择合适的模型

## 项目结构

```
NewAutoClip/
├── backend/              # FastAPI 后端
│   ├── api/            # API路由
│   ├── core/           # 核心模块
│   ├── models/         # 数据模型
│   ├── services/       # 业务逻辑
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── pages/        # 页面
│   │   └── services/     # API服务
└── data/                # 数据目录
```

## 技术栈

### 后端
- FastAPI - Web框架
- SQLite - 数据存储和任务队列
- Pydantic - 数据验证

### 前端
- React 18 - UI框架
- TypeScript - 类型安全
- Ant Design - UI组件库
- Vite - 构建工具

## License

本项目基于 MIT 许可证开源。

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
