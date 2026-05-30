# NewAutoClip

![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.8+-green?style=flat&logo=python)
![React](https://img.shields.io/badge/React-18+-blue?style=flat&logo=react)

**Language**: [English](README-EN.md) | [中文](README.md)

---

## 📢 Declaration and Acknowledgments

**NewAutoClip** is an AI-powered intelligent video clipping system that is a fork and modification of the original project [AutoClip](https://github.com/zhouxiaoka/autoclip).

We would like to thank the original author **zhouxiaoka** and all contributors to the original project. Their work laid the solid foundation for NewAutoClip.

---

## 🤖 Recommended Model

**We strongly recommend using the Qwen/Qwen2.5-14B-Instruct model from SiliconFlow!**

👉 [Sign up and get ¥16 free trial (approx. 1000 minutes of video processing)](https://cloud.siliconflow.cn/i/ygitVHwX)

**Advantages**:
- ✅ Supports long context, strong understanding capabilities
- ✅ Fast processing speed, cost-effective
- ✅ ¥16 trial can process approx. 1000 minutes of video
- ✅ No need for VPN

---

## Features

- 🎬 **Multi-platform Support**: Bilibili/YouTube video download, local file upload
- 🤖 **Multiple AI Model Support**: Supports Alibaba Tongyi Qianwen, SiliconFlow, OpenAI, Gemini, SenseTime, and more
- ✂️ **Intelligent Clipping**: AI automatically identifies and cuts exciting clips
- 📚 **Smart Collections**: AI-recommended and manually created video collections
- 🚀 **Real-time Processing**: Asynchronous task queue with real-time progress feedback
- 🎨 **Modern Interface**: React + TypeScript + Ant Design
- 🔐 **Persistent Configuration**: Comprehensive settings save and load mechanism
- 📦 **Batch Processing**: Supports processing multiple videos in sequence automatically
- 🗄️ **No Redis Dependency**: Uses SQLite for local task queue, no additional installation needed

## Quick Start

### Environment Requirements

- Python 3.8+
- Node.js 16+
- FFmpeg (for video processing)

### Installation Steps

#### Method 1: One-Click Startup (Recommended)

```bash
# Clone the project
git clone https://github.com/GHLiuyb/NewAutoClip.git
cd NewAutoClip

# For Windows users, double-click to run
一键启动.bat

# Or run manually
python 一键启动.py
```

#### Method 2: Manual Startup

```bash
# Clone the project
git clone https://github.com/GHLiuyb/NewAutoClip.git
cd NewAutoClip

# Install backend dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..

# Start backend
python -m uvicorn backend.main:app --reload --port 8000

# Start frontend (new terminal)
cd frontend
npm run dev
```

## Configuration Instructions

First run requires configuring AI service API key. On the settings page:

1. **Select AI Model Provider**: Tongyi Qianwen / SiliconFlow / OpenAI / Gemini / SenseTime
2. **Enter API Key**: Get from corresponding service provider
3. **Select Model**: Choose appropriate model based on provider

## Project Structure

```
NewAutoClip/
├── backend/                 # FastAPI backend
│   ├── api/                # API routes
│   ├── core/               # Core modules
│   ├── models/             # Data models
│   ├── services/           # Business logic
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Pages
│   │   └── services/       # API services
└── data/                   # Data directory
```

## Technology Stack

### Backend
- FastAPI - Web framework
- SQLite - Data storage and task queue
- Pydantic - Data validation

### Frontend
- React 18 - UI framework
- TypeScript - Type safety
- Ant Design - UI component library
- Vite - Build tool

## License

This project is licensed under the MIT License.

---

**⭐ If this project helps you, please give us a Star!**
