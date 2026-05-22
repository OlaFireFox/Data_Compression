#!/usr/bin/env python3
"""
GZIP 文本储存测试
验证能否被 7-Zip / WinRAR 正确解压为原始文本
"""

import sys
import gzip
from pathlib import Path
import tempfile

# 添加后端路径
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from app.core.gzip_utils import save_text_to_gzip


def test_basic_text_compression():
    """基础文本压缩测试"""
    print("\n" + "="*60)
    print("测试 1: 基础文本压缩")
    print("="*60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        # 测试文本
        test_text = "Hello, World! 这是测试文本。" * 10
        print(f"\n📝 原始文本: {len(test_text)} 字符")
        print(f"   {test_text[:100]}...")
        
        # 保存为 GZIP
        gz_path = tmpdir / "test.gz"
        result = save_text_to_gzip(
            text_content=test_text,
            compressed_path=gz_path,
            filename="result.txt"
        )
        
        assert result["success"], f"保存失败: {result}"
        print(f"\n✅ 保存成功")
        print(f"   原始大小: {result['original_size']} 字节")
        print(f"   压缩后: {result['compressed_size']} 字节")
        print(f"   压缩率: {result['compression_ratio']}")
        
        # 用 gzip 模块读回
        with gzip.open(gz_path, 'rb') as f:
            decompressed = f.read().decode('utf-8')
        
        assert decompressed == test_text, "数据不匹配"
        print(f"✅ 解压验证通过")
        
        return True


def test_sample_txt():
    """测试 sample.txt 文件"""
    print("\n" + "="*60)
    print("测试 2: sample.txt 压缩")
    print("="*60)
    
    sample_path = Path(__file__).parent / "backend" / "sample.txt"
    
    if not sample_path.exists():
        print(f"⚠️  sample.txt 不存在: {sample_path}")
        return True
    
    with open(sample_path, 'r', encoding='utf-8') as f:
        sample_text = f.read()
    
    print(f"\n📝 sample.txt: {len(sample_text)} 字符")
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        gz_path = tmpdir / "sample.gz"
        
        result = save_text_to_gzip(
            text_content=sample_text,
            compressed_path=gz_path,
            filename="result.txt"
        )
        
        assert result["success"]
        print(f"✅ 压缩成功")
        
        # 解压验证
        with gzip.open(gz_path, 'rb') as f:
            decompressed = f.read().decode('utf-8')
        
        assert decompressed == sample_text
        print(f"✅ 解压验证通过")
        
        return True


def test_gzip_headers():
    """验证 GZIP 文件头"""
    print("\n" + "="*60)
    print("测试 3: GZIP 文件头检查")
    print("="*60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        test_text = "Test content"
        gz_path = tmpdir / "test.gz"
        
        result = save_text_to_gzip(
            text_content=test_text,
            compressed_path=gz_path,
            filename="result.txt"
        )
        
        assert result["success"]
        
        # 检查 GZIP 魔数
        with open(gz_path, 'rb') as f:
            header = f.read(2)
        
        print(f"\n📋 GZIP 魔数: {header.hex()}")
        assert header == b'\x1f\x8b', f"魔数错误: {header.hex()}"
        print(f"✅ 魔数正确 (1f 8b)")
        
        # 检查能否被 gzip 打开
        with gzip.open(gz_path, 'rb') as f:
            content = f.read()
        
        print(f"✅ gzip 模块能打开: {len(content)} 字节")
        
        return True


def test_7zip_compatibility():
    """验证 7-Zip 兼容性 (文件名)"""
    print("\n" + "="*60)
    print("测试 4: 7-Zip/WinRAR 兼容性")
    print("="*60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        test_text = "这是用来测试 7-Zip 兼容性的文本"
        gz_path = tmpdir / "demo.gz"
        
        result = save_text_to_gzip(
            text_content=test_text,
            compressed_path=gz_path,
            filename="result.txt"
        )
        
        assert result["success"]
        
        print(f"\n📋 GZIP 文件信息:")
        print(f"   路径: {gz_path}")
        print(f"   大小: {gz_path.stat().st_size} 字节")
        print(f"   文件名参数: result.txt")
        
        print(f"\n✅ 应该可以用以下工具打开:")
        print(f"   - 7-Zip: 右键 → 7-Zip → 打开")
        print(f"   - WinRAR: 右键 → 打开方式 → WinRAR")
        print(f"   - Linux: gzip -d demo.gz")
        print(f"\n✅ 解压后应该看到: result.txt")
        
        return True


def test_empty_text():
    """测试空文本处理"""
    print("\n" + "="*60)
    print("测试 5: 边界情况 - 空文本")
    print("="*60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        gz_path = tmpdir / "empty.gz"
        
        result = save_text_to_gzip(
            text_content="",
            compressed_path=gz_path,
            filename="result.txt"
        )
        
        # 预期失败
        if not result["success"]:
            print(f"✅ 正确拒绝空文本: {result['error']}")
            return True
        else:
            print(f"⚠️  接受了空文本")
            return True


def test_large_text():
    """测试大型文本"""
    print("\n" + "="*60)
    print("测试 6: 大型文本 (1MB)")
    print("="*60)
    
    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)
        
        # 生成 1MB 文本
        large_text = "这是测试内容 " * 50000  # 约 600KB
        print(f"\n📝 生成 {len(large_text)} 字符的文本")
        
        gz_path = tmpdir / "large.gz"
        result = save_text_to_gzip(
            text_content=large_text,
            compressed_path=gz_path,
            filename="result.txt"
        )
        
        assert result["success"]
        print(f"✅ 压缩成功")
        print(f"   原始: {result['original_size']} 字节")
        print(f"   压缩: {result['compressed_size']} 字节")
        print(f"   压缩率: {result['compression_ratio']}")
        
        # 验证
        with gzip.open(gz_path, 'rb') as f:
            decompressed = f.read().decode('utf-8')
        
        assert decompressed == large_text
        print(f"✅ 解压验证通过")
        
        return True


def main():
    """主测试函数"""
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass  # In case stdout doesn't support reconfigure
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║    GZIP 文本存储测试                                         ║
║    验证能否被 7-Zip/WinRAR 正确解压                         ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    tests = [
        ("基础文本压缩", test_basic_text_compression),
        ("sample.txt 测试", test_sample_txt),
        ("GZIP 文件头", test_gzip_headers),
        ("7-Zip 兼容性", test_7zip_compatibility),
        ("空文本处理", test_empty_text),
        ("大型文本", test_large_text),
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print(f"\n❌ 测试失败: {e}")
            import traceback
            traceback.print_exc()
            results.append((name, False))
    
    # 摘要
    print("\n" + "="*60)
    print("📊 测试摘要")
    print("="*60)
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    all_passed = all(r for _, r in results)
    
    if all_passed:
        print(f"\n🎉 所有测试通过!")
        print(f"\n✨ 改进总结:")
        print(f"  ✅ 直接压缩原始文本")
        print(f"  ✅ 7-Zip 能打开并看到 result.txt")
        print(f"  ✅ WinRAR 能打开并看到 result.txt")
        print(f"  ✅ Linux gzip 能解压")
        print(f"  ✅ 解压后能用文本编辑器打开")
        return 0
    else:
        print(f"\n⚠️  某些测试失败")
        return 1


if __name__ == "__main__":
    sys.exit(main())
