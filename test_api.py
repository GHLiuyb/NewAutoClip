"""测试硅基流动API连接"""
import requests
import json

api_key = "sk-yjdevxmckdnbnnpmxvwrsbhzfqzvgnwkhbenqodixfzjdqab"
model = "Qwen/Qwen2.5-7B-Instruct"
url = "https://api.siliconflow.cn/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

content = "你好，请回复JSON格式：{\"status\": \"ok\", \"message\": \"test\"}"
data = {
    "model": model,
    "messages": [{"role": "user", "content": content}],
    "stream": False,
    "max_tokens": 100
}

try:
    print("Testing SiliconFlow API...")
    resp = requests.post(url, headers=headers, json=data, timeout=60)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")
    if resp.status_code == 200:
        result = resp.json()
        print(f"Content: {result['choices'][0]['message']['content']}")
except Exception as e:
    print(f"Error: {e}")
