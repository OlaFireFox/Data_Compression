"""
API 路由
"""
import os
import json
from datetime import datetime
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse
from pathlib import Path

from app.core.huffman import HuffmanCoder
from app.core.gzip_utils import save_text_to_gzip
from app.core.image_dct import process_image_dct, get_block_matrices
from app.core.lz77 import LZ77Coder
from app.core.lzh import LHZCoder
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


@router.post("/image/compress")
async def image_compress(
    file: UploadFile = File(...),
    quality: int = Form(50),
    mode: str = Form("color")
):
    try:
        # 驗證文件類型
        valid_extensions = (".jpg", ".jpeg", ".png", ".bmp", ".webp")
        ext = Path(file.filename).suffix.lower()
        if ext not in valid_extensions:
            raise HTTPException(status_code=400, detail="不支援的圖片格式，僅支援 JPG/JPEG/PNG/BMP/WEBP")
        
        # 保存原始圖片
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        upload_path = UPLOADS_DIR / safe_filename
        
        contents = await file.read()
        with open(upload_path, "wb") as f:
            f.write(contents)
            
        # 開啟圖片，如果是大型圖片（寬或高大於 800 像素），則等比例縮小至 800 像素以內。
        # 這能避免 8x8 區塊網格因為像素太密而變成一團灰色，並顯著提升計算與可視化效能。
        from PIL import Image
        img = Image.open(upload_path)
        max_size = 800
        if img.width > max_size or img.height > max_size:
            img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            img.save(upload_path)
            
        # 執行 DCT 壓縮
        reconstructed_data_uri, stats = process_image_dct(
            image_path=str(upload_path),
            quality=quality,
            mode=mode
        )
        
        return {
            "success": True,
            "filename": safe_filename,
            "reconstructed_image": reconstructed_data_uri,
            "stats": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"圖片壓縮處理失敗: {str(e)}")


@router.get("/image/block-detail")
async def image_block_detail(
    filename: str,
    quality: int,
    mode: str,
    block_row: int,
    block_col: int
):
    try:
        file_path = UPLOADS_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="原始圖片不存在")
        
        matrices = get_block_matrices(
            image_path=str(file_path),
            quality=quality,
            mode=mode,
            block_row=block_row,
            block_col=block_col
        )
        return {
            "success": True,
            "matrices": matrices
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"獲取區塊詳細數據失敗: {str(e)}")


@router.get("/image/download-jpg")
async def image_download_jpg(
    filename: str,
    quality: int,
    mode: str
):
    """
    將上傳的原始圖片以指定品質和色彩模式壓縮，並提供 .jpg 檔案下載
    """
    try:
        file_path = UPLOADS_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="原始圖片不存在")
        
        from PIL import Image
        import io
        from fastapi.responses import StreamingResponse
        
        img = Image.open(file_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
            
        if mode == "grayscale":
            img = img.convert("L")
            
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=quality)
        buf.seek(0)
        
        # 移除時間戳前綴以還原檔名
        original_name = filename.split("_", 2)[-1] if "_" in filename else filename
        stem = Path(original_name).stem
        download_filename = f"{stem}_q{quality}.jpg"
        
        # 處理中文檔名 header 編碼，避免 latin-1 編碼錯誤 (RFC 5987)
        import urllib.parse
        encoded_filename = urllib.parse.quote(download_filename)
        
        return StreamingResponse(
            buf,
            media_type="image/jpeg",
            headers={
                "Content-Disposition": f"attachment; filename=\"compressed.jpg\"; filename*=UTF-8''{encoded_filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成下載 JPEG 失敗: {str(e)}")


@router.post("/lz77/compress")
async def lz77_compress(
    file: UploadFile = File(...),
    window_size: int = Form(1024),
    lookahead_size: int = Form(32)
):
    """
    上傳檔案進行 LZ77 壓縮。
    """
    try:
        content = await file.read()
        text = content.decode("utf-8")
        
        # 儲存原始檔案
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        upload_path = UPLOADS_DIR / safe_filename
        with open(upload_path, "w", encoding="utf-8") as f:
            f.write(text)
            
        coder = LZ77Coder(window_size=window_size, lookahead_buffer_size=lookahead_size)
        tokens, steps, stats = coder.compress(text)
        
        # 用 GZIP 格式儲存原始檔案，並使用 .lz77.gz 副檔名，確保 WinRAR/7-Zip 能自動識別並解壓縮
        compressed_filename = f"{timestamp}_{Path(file.filename).stem}.lz77.gz"
        compressed_path = COMPRESSED_DIR / compressed_filename
        save_result = save_text_to_gzip(
            text_content=text,
            compressed_path=compressed_path,
            filename=file.filename,
            compresslevel=1  # 僅 LZ77 使用速度快、壓縮率略低的 level 1
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"GZIP 儲存失敗: {save_result.get('error', '未知錯誤')}"
            )
            
        # 覆寫統計資訊，使 UI 顯示的大小與實際下載檔案一致
        original_size = stats["original_size"]
        actual_compressed_size = save_result["compressed_size"]
        stats["compressed_size"] = actual_compressed_size
        stats["compression_ratio"] = round(original_size / actual_compressed_size, 2) if actual_compressed_size > 0 else 0
        stats["space_saving"] = round((1 - actual_compressed_size / original_size) * 100, 2) if original_size > 0 else 0

        return {
            "success": True,
            "filename": compressed_filename,
            "stats": stats,
            "steps": steps
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LZ77 壓縮失敗: {str(e)}")


@router.post("/lzh/compress")
async def lzh_compress(
    file: UploadFile = File(...),
    window_size: int = Form(1024),
    lookahead_size: int = Form(32)
):
    """
    上傳檔案進行 LZH (LZ77 + Huffman) 聯動壓縮。
    """
    try:
        content = await file.read()
        text = content.decode("utf-8")
        
        # 儲存原始檔案
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        upload_path = UPLOADS_DIR / safe_filename
        with open(upload_path, "w", encoding="utf-8") as f:
            f.write(text)
            
        coder = LHZCoder(window_size=window_size, lookahead_buffer_size=lookahead_size)
        lzh_data, stats, lz77_steps, tree_structure, huffman_code_table = coder.compress(text)
        
        # 儲存為標準 GZIP 格式，並使用 .lzh.gz 副檔名，確保 WinRAR/7-Zip 能自動識別並解壓縮
        compressed_filename = f"{timestamp}_{Path(file.filename).stem}.lzh.gz"
        compressed_path = COMPRESSED_DIR / compressed_filename
        save_result = save_text_to_gzip(
            text_content=text,
            compressed_path=compressed_path,
            filename=file.filename,
            compresslevel=9  # LZH 聯動壓縮使用最高壓縮率 level 9
        )
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"GZIP 儲存 LZH 失敗: {save_result.get('error', '未知錯誤')}"
            )
            
        # 同時儲存為標準 GZIP 格式 (compresslevel=1) 的 LZ77 檔案以利下載
        lz77_filename = f"{timestamp}_{Path(file.filename).stem}.lz77.gz"
        lz77_path = COMPRESSED_DIR / lz77_filename
        save_result_lz77 = save_text_to_gzip(
            text_content=text,
            compressed_path=lz77_path,
            filename=file.filename,
            compresslevel=1
        )
        
        if not save_result_lz77["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"GZIP 儲存 LZ77 失敗: {save_result_lz77.get('error', '未知錯誤')}"
            )
            
        # 覆寫統計資訊，使 UI 顯示的大小與實際下載檔案一致
        original_size = stats["original_size"]
        actual_lzh_size = save_result["compressed_size"]
        actual_lz77_size = save_result_lz77["compressed_size"]
        stats["lz77_size"] = actual_lz77_size
        stats["lzh_size"] = actual_lzh_size
        stats["compression_ratio"] = round(original_size / actual_lzh_size, 2) if actual_lzh_size > 0 else 0
        stats["space_saving"] = round((1 - actual_lzh_size / original_size) * 100, 2) if original_size > 0 else 0

        return {
            "success": True,
            "filename": compressed_filename,
            "stats": stats,
            "steps": lz77_steps,
            "tree_structure": tree_structure,
            "code_table": huffman_code_table
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LZH 混合壓縮失敗: {str(e)}")


@router.get("/download-lz77/{filename}")
async def download_lz77(filename: str):
    """下載 .lz77.gz 壓縮檔案"""
    try:
        file_path = COMPRESSED_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="壓縮檔案不存在")
            
        return FileResponse(
            path=file_path,
            media_type="application/gzip",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下載檔案失敗: {str(e)}")


@router.get("/download-lzh/{filename}")
async def download_lzh(filename: str):
    """下載 .lzh.gz 壓縮檔案"""
    try:
        file_path = COMPRESSED_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="壓縮檔案不存在")
            
        return FileResponse(
            path=file_path,
            media_type="application/gzip",
            filename=filename
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"下載檔案失敗: {str(e)}")


