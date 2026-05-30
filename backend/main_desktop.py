"""FastAPI应用入口点 - 桌面模式"""

import logging
import os
from backend.app_factory import create_app

os.environ["AUTOCLIP_DESKTOP_MODE"] = "1"

app = create_app(mode="desktop")

logger = logging.getLogger(__name__)

if __name__ == "__main__":
    import uvicorn
    import sys

    port = 8000

    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                try:
                    port = int(sys.argv[i + 1])
                except ValueError:
                    logger.error(f"无效的端口号: {sys.argv[i + 1]}")
                    port = 8000

    logger.info(f"启动服务器（桌面模式），端口: {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
