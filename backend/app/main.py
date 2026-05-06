"""
FastAPI 主應用程式
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import routes

# 創建 FastAPI 應用
app = FastAPI(
    title="Huffman 壓縮可視化 API",
    description="基於 Huffman 演算法的文本壓縮 API，支持壓縮過程可視化",
    version="1.0.0"
)

# 配置 CORS（允許前端跨域請求）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生產環境應該指定具體的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 包含路由
app.include_router(routes.router)


@app.get("/")
async def root():
    """根路由 - 顯示 API 信息"""
    return {
        "message": "歡迎使用 Huffman 壓縮可視化 API",
        "version": "1.0.0",
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


@app.get("/health")
async def health_check():
    """健康檢查端點"""
    return {
        "status": "healthy",
        "message": "API 運行正常"
    }


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """全局異常處理"""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "內部服務器錯誤",
            "detail": str(exc)
        }
    )


if __name__ == "__main__":
    import uvicorn
    
    # 運行開發服務器
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
