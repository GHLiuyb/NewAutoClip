"""测试硅基流动的不同模型"""
import requests

api_key = "sk-yjdevxmckdnbnnpmxvwrsbhzfqzvgnwkhbenqodixfzjdqab"
url = "https://api.siliconflow.cn/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 测试不同的模型
models_to_test = [
    "Qwen/Qwen2.5-7B-Instruct",
    "Qwen/Qwen2.5-14B-Instruct",
    "deepseek-ai/DeepSeek-V2.5",
    "THUDM/glm-4-9b-chat",
]

test_content = """你是一个AI助手。请用中文回答：人生的意义是什么？"""

for model in models_to_test:
    print(f"\n测试模型: {model}")
    data = {
        "model": model,
        "messages": [{"role": "user", "content": test_content}],
        "stream": False,
        "max_tokens": 200
    }

    try:
        resp = requests.post(url, headers=headers, json=data, timeout=30)
        if resp.status_code == 200:
            result = resp.json()
            content = result["choices"][0]["message"]["content"]
            print(f"  成功! 响应长度: {len(content)}")
            print(f"  响应内容: {content[:200]}...")
        else:
            print(f"  失败! 状态码: {resp.status_code}")
            print(f"  错误信息: {resp.text[:200]}")
    except Exception as e:
        print(f"  错误: {e}")
