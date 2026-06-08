"""
API 請求和回應的數據模型
"""
from pydantic import BaseModel
from typing import Dict, List, Optional


class CompressionResponse(BaseModel):
    """壓縮結果回應"""
    success: bool
    message: str
    encoded_text: str
    original_size: int
    encoded_size: int
    compression_ratio: float
    frequencies: Dict[str, int]
    code_table: Dict[str, str]
    build_steps: List[Dict]
    tree_structure: Optional[Dict] = None
    compressed_filename: Optional[str] = None  # ⭐ 新增壓縮檔案名稱
    compressed_size: Optional[int] = None      # 實際壓縮後檔案大小(字節)


class DecompressionRequest(BaseModel):
    """解壓縮請求"""
    encoded_text: str
    code_table: Dict[str, str]


class DecompressionResponse(BaseModel):
    """解壓縮結果回應"""
    success: bool
    message: str
    decoded_text: str


class ErrorResponse(BaseModel):
    """錯誤回應"""
    success: bool = False
    message: str
    detail: Optional[str] = None
