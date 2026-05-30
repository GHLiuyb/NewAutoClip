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

## 项目起源

**NewAutoClip** 是基于 [AutoClip](https://github.com/zhouxiaoka/autoclip) 项目二次开发而来的视频智能切片系统。

> 如果这个项目对你有帮助，请给原项目 [AutoClip](https://github.com/zhouxiaoka/autoclip) 一个 ⭐ Star！

## 功能特性

- 🎬 **多平台支持**: B站/YouTube视频下载，支持本地文件上传
- 🤖 **多AI模型支持**: 支持阿里通义千问、硅基流动、OpenAI、Gemini、商汤日日新等多个AI服务提供商
- ✂️ **智能切片**: AI自动识别精彩片段并切割
- 📚 **智能合集**: AI推荐和手动创建视频合集
- 🚀 **实时处理**: 异步任务队列，实时进度反馈
- 🎨 **现代界面**: React + TypeScript + Ant Design
- 📱 **桌面应用**: 支持 Tauri 桌面应用
- 🔐 **配置持久化**: 完善的设置保存和加载机制

## 快速开始

### 环境要求

- Python 3.8+
- Node.js 16+
- FFmpeg (视频处理)

### 安装步骤

#### 方式一：一键启动（推荐）

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/NewAutoClip.git
cd NewAutoClip

# Windows 用户双击运行
一键启动.bat

# 或手动运行
python 一键启动.py
```

#### 方式二：手动启动

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/NewAutoClip.git
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

### 使用Docker

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/NewAutoClip.git
cd NewAutoClip

# 一键启动
docker-compose up -d
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
│   └── tasks/          # 异步任务
├── frontend/            # React 前端
│   ├── src/
│   │   ├── components/  # React组件
│   │   ├── pages/        # 页面
│   │   └── services/     # API服务
├── src-tauri/          # Tauri 桌面应用
├── prompt/              # AI提示词模板
└── scripts/             # 工具脚本
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

### 桌面应用
- Tauri - 跨平台桌面框架

## 主要改进

相比原版 AutoClip，本项目进行了以下改进：

1. **多AI模型支持**: 支持更多AI服务提供商，可灵活切换
2. **配置优化**: 修复了多个配置持久化问题
3. **桌面模式增强**: 改进了桌面应用的用户体验
4. **批量处理**: 支持批量处理多个视频，自动顺序执行
5. **移除Redis依赖**: 使用SQLite实现本地任务队列，无需额外安装
6. **Bug修复**: 修复了多个已知问题

## License

本项目基于 MIT 许可证开源。

## 致谢

- 感谢原项目 [AutoClip](https://github.com/zhouxiaoka/autoclip) 的作者和贡献者
- 感谢所有开源项目的贡献者

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**
