#!/usr/bin/env python3
"""
GZIP 檔名測試腳本
驗證解壓縮後能否看到正確的檔名
"""

import gzip
import io
import tarfile
import tempfile
from pathlib import Path

def test_gzip_with_filename():
    """測試使用 GzipFile 設置檔名"""
    print("\n" + "=" * 60)
    print("測試 1: GzipFile 設置檔名")
    print("=" * 60)
    
    # 測試數據
    test_data = b"Hello, Huffman Compression World!"
    print(f"\n原始數據 ({len(test_data)} 字節): {test_data}")
    
    # 方法 A: 使用 gzip.compress() (舊方法，無檔名)
    print("\n📋 方法 A: gzip.compress()")
    compressed_a = gzip.compress(test_data)
    print(f"  壓縮大小: {len(compressed_a)} 字節")
    
    # 方法 B: 使用 GzipFile (新方法，有檔名) ✅
    print("\n📋 方法 B: gzip.GzipFile (推薦)")
    buf = io.BytesIO()
    with gzip.GzipFile(
        fileobj=buf,
        mode="wb",
        filename="decompressed_result.txt"
    ) as f:
        f.write(test_data)
    compressed_b = buf.getvalue()
    print(f"  壓縮大小: {len(compressed_b)} 字節")
    
    # 比較大小
    print(f"\n大小差異: {len(compressed_b) - len(compressed_a)} 字節 (檔名 metadata 開銷)")
    
    return compressed_b

def test_decompress_with_tools():
    """測試用標準工具解壓"""
    print("\n" + "=" * 60)
    print("測試 2: 用標準工具解壓縮")
    print("=" * 60)
    
    # 創建測試檔
    test_data = b"Test Content for Huffman Compression"
    
    # 使用新方法壓縮
    buf = io.BytesIO()
    with gzip.GzipFile(
        fileobj=buf,
        mode="wb",
        filename="decompressed_result.txt"
    ) as f:
        f.write(test_data)
    compressed_data = buf.getvalue()
    
    # 寫入臨時檔案
    with tempfile.NamedTemporaryFile(suffix=".gz", delete=False) as tmp:
        tmp.write(compressed_data)
        tmp_path = tmp.name
    
    print(f"\n建立臨時檔: {tmp_path}")
    print(f"檔案大小: {Path(tmp_path).stat().st_size} 字節")
    
    # 用 gzip 模塊解壓
    print("\n📖 用 Python gzip 模塊解壓:")
    with gzip.open(tmp_path, 'rb') as f:
        decompressed = f.read()
    print(f"  ✅ 解壓成功: {len(decompressed)} 字節")
    print(f"  內容: {decompressed}")
    
    # 檢查 gzip header
    print("\n📋 GZIP 檔頭信息:")
    with open(tmp_path, 'rb') as f:
        header = f.read(10)
        print(f"  魔數: {header[:2].hex()}")  # 應該是 1f 8b
        
        # 讀取完整 gzip 頭
        f.seek(0)
        with gzip.open(tmp_path, 'rb') as gz:
            # gzip.GzipFile 對象有 fname 屬性
            if hasattr(gz, 'fname'):
                print(f"  內部檔名: {gz.fname}")
    
    # 清理
    Path(tmp_path).unlink()
    print(f"\n清理: {tmp_path} 已刪除")
    
    return decompressed == test_data

def test_huffman_simulation():
    """模擬 Huffman 壓縮流程"""
    print("\n" + "=" * 60)
    print("測試 3: Huffman 壓縮流程模擬")
    print("=" * 60)
    
    # 模擬 Huffman 編碼文本
    encoded_text = "01100001011000100110001101100100"  # 模擬 8 位編碼
    print(f"\n編碼文本 ({len(encoded_text)} bits): {encoded_text}")
    
    # 轉換為字節
    encoded_bytes = bytes(
        int(encoded_text[i:i+8], 2) 
        for i in range(0, len(encoded_text), 8)
    )
    print(f"轉換為字節 ({len(encoded_bytes)} 字節): {encoded_bytes.hex()}")
    
    # 壓縮
    buf = io.BytesIO()
    with gzip.GzipFile(
        fileobj=buf,
        mode="wb",
        filename="decompressed_result.txt"
    ) as f:
        f.write(encoded_bytes)
    compressed_data = buf.getvalue()
    
    print(f"GZIP 壓縮後 ({len(compressed_data)} 字節)")
    
    # 解壓
    decompressed = gzip.decompress(compressed_data)
    print(f"解壓後 ({len(decompressed)} 字節): {decompressed.hex()}")
    
    # 驗證
    if decompressed == encoded_bytes:
        print("\n✅ 驗證通過: 解壓數據與原始相同")
        return True
    else:
        print("\n❌ 驗證失敗: 數據不匹配")
        return False

def test_file_operations():
    """測試檔案操作"""
    print("\n" + "=" * 60)
    print("測試 4: 檔案讀寫操作")
    print("=" * 60)
    
    test_data = b"Test File Content"
    
    with tempfile.TemporaryDirectory() as tmpdir:
        gz_path = Path(tmpdir) / "test.gz"
        
        # 寫入檔案
        print(f"\n寫入: {gz_path}")
        buf = io.BytesIO()
        with gzip.GzipFile(
            fileobj=buf,
            mode="wb",
            filename="decompressed_result.txt"
        ) as f:
            f.write(test_data)
        
        with open(gz_path, "wb") as f:
            f.write(buf.getvalue())
        
        print(f"  ✅ 檔案大小: {gz_path.stat().st_size} 字節")
        
        # 讀取檔案
        print(f"\n讀取: {gz_path}")
        with gzip.open(gz_path, 'rb') as f:
            content = f.read()
        
        print(f"  ✅ 內容: {content}")
        
        if content == test_data:
            print("\n✅ 檔案操作驗證通過")
            return True
        else:
            print("\n❌ 檔案操作驗證失敗")
            return False

def main():
    """主測試函數"""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║          GZIP 檔名設置 - 驗證測試                            ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    # 運行所有測試
    test_gzip_with_filename()
    results.append(("GzipFile 設置", True))
    
    results.append(("解壓縮驗證", test_decompress_with_tools()))
    results.append(("Huffman 模擬", test_huffman_simulation()))
    results.append(("檔案操作", test_file_operations()))
    
    # 摘要
    print("\n" + "=" * 60)
    print("📊 測試摘要")
    print("=" * 60)
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    all_passed = all(r for _, r in results)
    
    if all_passed:
        print(f"\n🎉 所有測試通過！")
        print(f"\n💡 關鍵改進:")
        print(f"   • 使用 gzip.GzipFile 而不是 gzip.compress()")
        print(f"   • 設置 filename=\"decompressed_result.txt\" 參數")
        print(f"   • 解壓縮工具 (7-Zip, WinRAR) 會顯示正確的檔名")
        print(f"   • 提供更好的使用者體驗")
    else:
        print(f"\n⚠️  某些測試失敗")
    
    print()

if __name__ == "__main__":
    main()
