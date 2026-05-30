"""测试更大模型"""
import requests
import json

api_key = "sk-yjdevxmckdnbnnpmxvwrsbhzfqzvgnwkhbenqodixfzjdqab"
url = "https://api.siliconflow.cn/v1/chat/completions"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 读取实际的数据
project_dir = "data/projects/4e27a59e-b93c-4f30-8dbe-d0b765204f52"
metadata_dir = f"{project_dir}/metadata"

# 读取SRT块数据
with open(f"{metadata_dir}/step1_srt_chunks/chunk_0.json", "r", encoding="utf-8") as f:
    srt_chunk_data = json.load(f)

# 读取大纲数据
with open(f"{metadata_dir}/step1_outline.json", "r", encoding="utf-8") as f:
    outlines = json.load(f)

# 构建SRT文本
srt_text_for_prompt = ""
for sub in srt_chunk_data:
    srt_text_for_prompt += f"{sub['index']} {sub['start_time']} {sub['text']}\n"

# 准备大纲
llm_input_outlines = [
    {"title": o.get("title"), "subtopics": o.get("subtopics")}
    for o in outlines
]

input_data = {
    "outline": llm_input_outlines,
    "srt_text": srt_text_for_prompt
}

# 简化的提示词
prompt = """分析视频字幕内容，找出每个话题的时间区间。

输出JSON数组格式：
[{"outline": "话题", "start": "00:00", "end": "01:00"}]

只输出JSON，不要其他文字。"""

full_input = f"{prompt}\n\n话题：\n{json.dumps(llm_input_outlines, ensure_ascii=False, indent=2)}\n\n字幕：\n{srt_text_for_prompt}"

print(f"发送内容长度: {len(full_input)} 字符")

# 测试更大的模型
data = {
    "model": "Qwen/Qwen2.5-14B-Instruct",
    "messages": [{"role": "user", "content": full_input}],
    "stream": False,
    "max_tokens": 2000
}

print("\n发送请求...")
resp = requests.post(url, headers=headers, json=data, timeout=120)
print(f"状态码: {resp.status_code}")

if resp.status_code == 200:
    result = resp.json()
    content = result["choices"][0]["message"]["content"]
    print(f"响应长度: {len(content)} 字符")
    print(f"响应内容:\n{content}")
else:
    print(f"错误信息: {resp.text}")
