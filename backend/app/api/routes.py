"""
API 路由
"""
import os
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from app.core.huffman import HuffmanCoder
from app.core.gzip_utils import save_text_to_gzip
from app.models.schemas import (
    CompressionResponse,
    DecompressionRequest,
    DecompressionResponse,
    ErrorResponse
)

router = APIRouter(prefix="/api", tags=["compression"])

# 文件保存路徑
UPLOADS_DIR = Path("uploads")
COMPRESSED_DIR = Path("compressed")

# 確保文件夾存在
UPLOADS_DIR.mkdir(exist_ok=True)
COMPRESSED_DIR.mkdir(exist_ok=True)


@router.post("/upload", response_model=CompressionResponse)
async def upload_and_compress(file: UploadFile = File(...)):
    """
    上傳 .txt 文件並進行 Huffman 壓縮
    
    - **file**: 上傳的 .txt 文件
    
    返回壓縮結果、編碼表和構建 Huffman Tree 的過程數據
    """
    try:
        # 驗證文件類型
        if not file.filename.endswith(".txt"):
            raise HTTPException(status_code=400, detail="只接受 .txt 文件")
        
        # 讀取文件內容
        content = await file.read()
        text = content.decode("utf-8")
        
        if not text:
            raise HTTPException(status_code=400, detail="文件為空")
        
        # 創建 Huffman 編碼器
        coder = HuffmanCoder()
        
        # 執行壓縮
        encoded_text, metadata = coder.compress(text)
        
        # 獲取樹結構
        tree_structure = coder.get_tree_structure()
        
        # 保存上傳的文件
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        upload_filename = f"{timestamp}_{file.filename}"
        upload_path = UPLOADS_DIR / upload_filename
        
        with open(upload_path, "w", encoding="utf-8") as f:
            f.write(text)
        
        # ⭐ 保存壓縮後的檔案為 GZIP 格式
        # 注意: 直接壓縮原始文本內容，不是 Huffman 編碼結果
        # 這樣解壓後就是可讀的 .txt 檔案
        compressed_filename = f"{timestamp}_compressed.gz"
        compressed_path = COMPRESSED_DIR / compressed_filename
        
        # 使用新的 GZIP 儲存函數，壓縮原始文本
        save_result = save_text_to_gzip(
            text_content=text,  # ⭐ 使用原始文本
            compressed_path=compressed_path,
            filename="result.txt"
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"GZIP 儲存失敗: {save_result.get('error', '未知錯誤')}"
            )
        
        # 保存元數據
        metadata_filename = f"{timestamp}_metadata.json"
        metadata_path = COMPRESSED_DIR / metadata_filename
        metadata_json = {
            **metadata,
            "original_filename": file.filename,
            "upload_filename": upload_filename,
            "compressed_filename": compressed_filename,
            "tree_structure": tree_structure,
            "timestamp": timestamp
        }
        
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata_json, f, ensure_ascii=False, indent=2)
        
        # 安全截斷過長的二進位字串，避免瀏覽器解析與網路傳輸卡死
        truncated_encoded = encoded_text if len(encoded_text) <= 10000 else (encoded_text[:10000] + "...(過長已截斷)")
        
        return CompressionResponse(
            success=True,
            message="文件壓縮成功",
            encoded_text=truncated_encoded,
            original_size=metadata["original_size"],
            encoded_size=metadata["encoded_size"],
            compression_ratio=save_result.get('compression_ratio', metadata["compression_ratio"]),
            frequencies=metadata["frequencies"],
            code_table=metadata["code_table"],
            build_steps=metadata["build_steps"],
            tree_structure=tree_structure,
            compressed_filename=compressed_filename  # ⭐ 壓縮檔案名稱
        )
    
    except HTTPException:
        raise
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="文件編碼不是 UTF-8")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"壓縮失敗: {str(e)}")


@router.post("/decompress", response_model=DecompressionResponse)
async def decompress(request: DecompressionRequest):
    """
    解壓縮 Huffman 編碼文本
    
    - **encoded_text**: 編碼後的二進位字符串
    - **code_table**: 解碼表
    
    返回原始文本
    """
    try:
        coder = HuffmanCoder()
        coder.reverse_codes = {v: k for k, v in request.code_table.items()}
        
        decoded_text = coder.decompress(request.encoded_text)
        
        return DecompressionResponse(
            success=True,
            message="解壓縮成功",
            decoded_text=decoded_text
        )
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解壓縮失敗: {str(e)}")


@router.get("/download/{filename}")
async def download_compressed(filename: str):
    """
    下載壓縮後的 .gz 文件 (標準 GZIP 格式)
    
    - **filename**: 壓縮文件名 (副檔名: .gz)
    
    ⭐ 輸出檔案格式: GZIP (.gz)
    ⭐ 可直接用 7-Zip 或 WinRAR 解壓
    ⭐ 解壓後是原始文本 result.txt
    """
    try:
        file_path = COMPRESSED_DIR / filename
        
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")
        
        # ⭐ 強制副檔名為 .gz
        if not filename.endswith('.gz'):
            filename = filename + '.gz'
        
        # ⭐ 返回正確的 GZIP Content-Type
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type="application/gzip",  # ✅ GZIP MIME type
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下載失敗: {str(e)}")


@router.get("/compression-history")
async def get_compression_history():
    """
    獲取壓縮歷史記錄
    
    返回所有壓縮文件的元數據
    """
    try:
        history = []
        
        # 遍歷所有元數據文件
        for metadata_file in COMPRESSED_DIR.glob("*_metadata.json"):
            with open(metadata_file, "r", encoding="utf-8") as f:
                metadata = json.load(f)
                history.append({
                    "timestamp": metadata.get("timestamp"),
                    "original_filename": metadata.get("original_filename"),
                    "compressed_filename": metadata.get("compressed_filename"),
                    "original_size": metadata.get("original_size"),
                    "encoded_size": metadata.get("encoded_size"),
                    "compression_ratio": metadata.get("compression_ratio")
                })
        
        # 按時間戳排序（最新在前）
        history.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "success": True,
            "message": "獲取歷史記錄成功",
            "count": len(history),
            "data": history
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取歷史記錄失敗: {str(e)}")
