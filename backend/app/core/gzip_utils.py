"""
GZIP 檔案儲存工具模塊
提供可靠的文本壓縮儲存邏輯
"""

import io
import gzip
from typing import Tuple


def save_text_to_gzip(
    text_content: str,
    compressed_path,
    filename: str = "result.txt",
    compresslevel: int = 9
) -> dict:
    """
    將文本內容直接保存為 GZIP 格式檔案。
    
    此函數確保:
    1. ✅ 原始數據: 寫入原始文本 bytes
    2. ✅ GzipFile: 使用 gzip.GzipFile 並設置檔名
    3. ✅ 緩衝區: 使用 with 語句確保完整寫入
    4. ✅ 診斷: 打印詳細信息
    
    參數:
        text_content: 要壓縮的文本內容 (字符串)
        compressed_path: 儲存 .gz 檔案的路徑
        filename: GZIP 內部檔名 (解壓時使用)
    
    返回:
        dict 包含:
        - success: 是否成功
        - compressed_size: 壓縮後檔案大小
        - original_size: 原始文本大小
        - compression_ratio: 壓縮率
    
    範例:
        >>> result = save_text_to_gzip(
        ...     "Hello, World!",
        ...     Path("output.gz"),
        ...     filename="message.txt"
        ... )
        >>> print(result["success"])  # True
        >>> print(result["compressed_size"])  # 壓縮後大小
    """
    print(f"\n{'='*60}")
    print(f"💾 GZIP 文本儲存診斷")
    print(f"{'='*60}")
    
    try:
        # ========== 第 1 步: 準備數據 ==========
        print(f"\n📝 第 1 步: 準備數據")
        
        # 轉換為 UTF-8 bytes
        text_bytes = text_content.encode('utf-8')
        print(f"  原始文本大小: {len(text_bytes)} 字節")
        print(f"  文本長度: {len(text_content)} 字符")
        print(f"  前 100 字符: {text_content[:100]!r}")
        
        if len(text_bytes) == 0:
            raise ValueError("❌ 文本內容為空!")
        
        # ========== 第 2 步: 使用 GzipFile ==========
        print(f"\n🗜️  第 2 步: GZIP 壓縮")
        print(f"  內部檔名: {filename}")
        
        # 建立內存緩衝區
        buf = io.BytesIO()
        
        # 使用 GzipFile 進行壓縮，並設置檔名
        with gzip.GzipFile(
            fileobj=buf,
            mode="wb",
            filename=filename,
            mtime=0,  # 固定時間戳便於測試
            compresslevel=compresslevel
        ) as gz:
            bytes_written = gz.write(text_bytes)
            print(f"  📝 寫入字節: {bytes_written} 字節")
            
            if bytes_written != len(text_bytes):
                raise ValueError(
                    f"❌ 寫入不完整: 期望 {len(text_bytes)}, 實際 {bytes_written}"
                )
        
        # ✅ 重要: 必須在 with 語句結束後讀取
        compressed_data = buf.getvalue()
        
        print(f"  ✅ GZIP 壓縮完成: {len(compressed_data)} 字節")
        
        # ========== 第 3 步: 寫入檔案 ==========
        print(f"\n💾 第 3 步: 寫入檔案")
        print(f"  路徑: {compressed_path}")
        
        with open(compressed_path, "wb") as f:
            bytes_written = f.write(compressed_data)
        
        if bytes_written != len(compressed_data):
            raise ValueError(
                f"❌ 檔案寫入不完整: 期望 {len(compressed_data)}, 實際 {bytes_written}"
            )
        
        print(f"  ✅ 寫入成功: {bytes_written} 字節")
        
        # ========== 第 4 步: 驗證檔案 ==========
        print(f"\n🔎 第 4 步: 驗證檔案")
        
        file_size = compressed_path.stat().st_size if hasattr(compressed_path, 'stat') else None
        
        if file_size:
            print(f"  ✅ 檔案大小: {file_size} 字節")
            
            if file_size == 0:
                raise ValueError("❌ 檔案大小為 0!")
        
        # ========== 第 5 步: 解壓驗證 ==========
        print(f"\n🔓 第 5 步: 解壓驗證")
        
        decompressed = gzip.decompress(compressed_data)
        print(f"  ✅ 解壓成功: {len(decompressed)} 字節")
        
        # 驗證內容相同
        if decompressed != text_bytes:
            raise ValueError("❌ 解壓數據不匹配!")
        
        print(f"  ✅ 內容驗證通過: 完全相同")
        
        # 驗證文本
        decompressed_text = decompressed.decode('utf-8')
        if decompressed_text != text_content:
            raise ValueError("❌ 文本不匹配!")
        
        print(f"  ✅ 文本驗證通過")
        
        # ========== 最終報告 ==========
        print(f"\n{'='*60}")
        print(f"✅ GZIP 儲存成功!")
        print(f"{'='*60}\n")
        
        # 計算壓縮率
        compression_ratio = len(text_bytes) / len(compressed_data) if len(compressed_data) > 0 else 0
        
        return {
            "success": True,
            "compressed_size": len(compressed_data),
            "original_size": len(text_bytes),
            "compression_ratio": round(compression_ratio, 2)  # ✅ 返回浮點數
        }
    
    except Exception as e:
        print(f"\n❌ GZIP 儲存失敗!")
        print(f"錯誤: {e}")
        print(f"{'='*60}\n")
        
        return {
            "success": False,
            "error": str(e)
        }
