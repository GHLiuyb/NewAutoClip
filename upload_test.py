"""上传视频测试"""
import requests
import json

# 读取视频文件
video_path = "c:/Tools/Autoclip/test/人生区区三万天.mp4"

# 上传视频
url = "http://127.0.0.1:8000/api/v1/upload/local"

with open(video_path, "rb") as f:
    files = {"file": ("人生区区三万天.mp4", f, "video/mp4")}
    data = {"project_name": "人生区区三万天_test", "video_category": "speech"}
    response = requests.post(url, files=files, data=data)

print(f"状态码: {response.status_code}")
print(f"响应: {response.text}")
