#!/usr/bin/env python3
"""
简单验证脚本：测试移除 Redis 依赖后核心模块能否正常导入
"""
import sys
import traceback

print("=" * 60)
print("验证核心模块导入测试")
print("=" * 60)
print()

modules_to_test = [
    ("app_factory", "from backend.app_factory import create_app"),
    ("main", "from backend.main import app"),
    ("database", "from backend.core.database import engine, get_db"),
    ("models", "from backend.models.base import Base"),
    ("config", "from backend.core.config import settings"),
    ("batch_processor", "from backend.services.batch_processor import batch_processor"),
    ("processing_service", "from backend.services.processing_service import ProcessingService"),
]

all_passed = True

for module_name, import_code in modules_to_test:
    print(f"测试 {module_name}... ", end="")
    try:
        exec(import_code)
        print("✅ 通过")
    except Exception as e:
        print(f"❌ 失败")
        print(f"  错误: {e}")
        print()
        print("详细错误信息:")
        traceback.print_exc()
        all_passed = False
        print()

print()
print("=" * 60)
if all_passed:
    print("✅ 所有核心模块导入测试通过！")
    print("✅ 现在可以正常使用了！")
else:
    print("❌ 部分模块导入测试失败，请检查上述错误")
print("=" * 60)

sys.exit(0 if all_passed else 1)
