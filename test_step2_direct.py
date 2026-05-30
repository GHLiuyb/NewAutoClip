"""直接测试Step 2的LLM调用"""
import json
import sys
from pathlib import Path
import importlib

# 强制重新加载模块
sys.path.insert(0, str(Path(__file__).parent))

# 强制重新加载LLM管理器
import backend.core.llm_manager
importlib.reload(backend.core.llm_manager)

from backend.core.llm_manager import get_llm_manager

# 读取测试数据
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
    srt_text_for_prompt += f"{sub['index']} {sub['start_time']} {sub['text']}\n"

# 准备大纲
llm_input_outlines = [
    {"title": o.get("title"), "subtopics": o.get("subtopics")}
    for o in outlines
]

# 读取提示词
prompt_file = Path("backend/prompt/时间点.txt")
if prompt_file.exists():
    with open(prompt_file, "r", encoding="utf-8") as f:
        prompt = f.read()
else:
    prompt = "请分析以下内容并返回JSON格式的时间点信息"

input_data = {
    "outline": llm_input_outlines,
    "srt_text": srt_text_for_prompt
}

print(f"大纲数量: {len(llm_input_outlines)}")
print(f"提示词长度: {len(prompt)}")
print(f"输入数据长度: {len(json.dumps(input_data, ensure_ascii=False))}")

# 测试LLM调用
print("\n开始测试LLM调用...")
try:
    llm_manager = get_llm_manager()
    print(f"当前模型: {llm_manager.settings.get('model_name')}")

    response = llm_manager.call(prompt, input_data, max_tokens=2000)
    print(f"响应长度: {len(response)} 字符")
    print(f"响应内容:\n{response}")

    # 保存响应到文件
    output_dir = metadata_dir / "step2_llm_raw_output"
    output_dir.mkdir(parents=True, exist_ok=True)
    with open(output_dir / "chunk_0_direct_test.txt", "w", encoding="utf-8") as f:
        f.write(response)
    print(f"\n响应已保存到: {output_dir / 'chunk_0_direct_test.txt'}")

except Exception as e:
    print(f"LLM调用失败: {e}")
    import traceback
    traceback.print_exc()
