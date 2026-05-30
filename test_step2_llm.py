"""测试Step 2的LLM调用"""
import json
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

# 测试完整的LLM调用流程
from backend.core.llm_manager import get_llm_manager

# 加载测试数据
project_dir = Path("data/projects/4e27a59e-b93c-4f30-8dbe-d0b765204f52")
metadata_dir = project_dir / "metadata"

# 读取SRT块数据
with open(metadata_dir / "step1_srt_chunks/chunk_0.json", "r", encoding="utf-8") as f:
    srt_chunk_data = json.load(f)

# 读取大纲数据
with open(metadata_dir / "step1_outline.json", "r", encoding="utf-8") as f:
    outlines = json.load(f)

# 构建SRT文本
srt_text_for_prompt = ""
for sub in srt_chunk_data:
    srt_text_for_prompt += f"{sub['index']}\n{sub['start_time']} --> {sub['end_time']}\n{sub['text']}\n\n"

print(f"SRT文本长度: {len(srt_text_for_prompt)} 字符")

# 准备大纲
llm_input_outlines = [
    {"title": o.get("title"), "subtopics": o.get("subtopics")}
    for o in outlines
]

input_data = {
    "outline": llm_input_outlines,
    "srt_text": srt_text_for_prompt
}

print(f"大纲数量: {len(llm_input_outlines)}")
print(f"输入数据JSON长度: {len(json.dumps(input_data, ensure_ascii=False))} 字符")

# 读取提示词
prompt_file = Path("backend/prompt/时间点.txt")
if prompt_file.exists():
    with open(prompt_file, "r", encoding="utf-8") as f:
        prompt = f.read()
    print(f"提示词长度: {len(prompt)} 字符")
else:
    print("提示词文件不存在")
    prompt = "请分析以下内容并返回JSON格式的时间点信息"

# 调用LLM
print("\n开始调用LLM...")
try:
    llm_manager = get_llm_manager()
    response = llm_manager.call(prompt, input_data, max_tokens=4000)
    print(f"LLM响应长度: {len(response)} 字符")
    print(f"LLM响应内容:\n{response[:1000]}")
except Exception as e:
    print(f"LLM调用失败: {e}")
    import traceback
    traceback.print_exc()
