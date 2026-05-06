# Huffman 壓縮可視化 - 後端 API

## 項目結構

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 主應用
│   ├── core/
│   │   ├── __init__.py
│   │   └── huffman.py          # Huffman 演算法核心實現
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py           # API 路由定義
│   └── models/
│       ├── __init__.py
│       └── schemas.py          # Pydantic 數據模型
├── uploads/                     # 上傳的原始文件目錄
├── compressed/                  # 壓縮後的文件和元數據目錄
├── requirements.txt             # 項目依賴
├── run.py                       # 啟動腳本
└── README.md                    # 項目文檔
```

## 功能概述

### 核心功能 (HuffmanCoder)

- **計算字符頻率**: 分析輸入文本中每個字符出現的次數
- **構建 Huffman Tree**: 按照最優演算法構建編碼樹
- **記錄構建過程**: 詳細記錄每一步合併操作
  - 左子樹節點信息
  - 右子樹節點信息
  - 新合併節點信息
- **生成編碼表**: 為每個字符生成對應的二進位編碼
- **編碼/解碼**: 支持文本的壓縮和解壓縮

### API 端點

#### 1. 文件上傳與壓縮
```
POST /api/upload
```
- 接收 .txt 文件上傳
- 返回壓縮結果、編碼表、構建過程數據、樹結構

**請求**: 
```
Content-Type: multipart/form-data
file: <.txt file>
```

**回應示例**:
```json
{
  "success": true,
  "message": "文件壓縮成功",
  "encoded_text": "10110101...",
  "original_size": 1000,
  "encoded_size": 642,
  "compression_ratio": 36.5,
  "frequencies": {"a": 150, "b": 120, ...},
  "code_table": {"a": "00", "b": "01", ...},
  "build_steps": [
    {
      "step": 1,
      "left_node": {"char": "a", "freq": 5, "node_id": 0, "is_leaf": true},
      "right_node": {"char": "b", "freq": 3, "node_id": 1, "is_leaf": true},
      "parent_node": {"freq": 8, "node_id": 2, "is_leaf": false}
    },
    ...
  ],
  "tree_structure": {...}
}
```

#### 2. 解壓縮
```
POST /api/decompress
```
- 接收編碼文本和編碼表
- 返回原始文本

**請求**:
```json
{
  "encoded_text": "10110101...",
  "code_table": {"a": "00", "b": "01", ...}
}
```

**回應**:
```json
{
  "success": true,
  "message": "解壓縮成功",
  "decoded_text": "original text..."
}
```

#### 3. 下載壓縮文件
```
GET /api/download/{filename}
```
- 下載壓縮後的 .bin 二進位文件

#### 4. 壓縮歷史
```
GET /api/compression-history
```
- 獲取所有壓縮操作的歷史記錄

#### 5. 健康檢查
```
GET /health
```

## 安裝與運行

### 1. 安裝依賴
```bash
pip install -r requirements.txt
```

### 2. 運行服務器
```bash
python run.py
```

或使用 uvicorn 直接運行:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 訪問 API 文檔
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## 數據結構說明

### Build Steps（構建過程）
每一步記錄了 Huffman Tree 的一次合併操作：

```json
{
  "step": 1,
  "left_node": {
    "char": "a",           // 字符（葉節點才有）
    "freq": 5,            // 頻率
    "node_id": 0,         // 節點唯一識別碼
    "is_leaf": true       // 是否為葉節點
  },
  "right_node": {
    "char": null,
    "freq": 8,
    "node_id": 2,
    "is_leaf": false
  },
  "parent_node": {
    "freq": 13,           // 父節點頻率 = left + right
    "node_id": 3,
    "is_leaf": false
  }
}
```

### Tree Structure（樹結構）
遞歸表示整個 Huffman Tree：

```json
{
  "freq": 100,
  "node_id": 5,
  "is_leaf": false,
  "left": { ... },
  "right": { ... }
}
```

## 前端集成指南

1. **上傳並壓縮**:
   - 調用 `/api/upload` 上傳 .txt 文件
   - 獲取 `build_steps` 數據進行動畫
   - 展示 `code_table` 和 `frequencies`

2. **可視化**:
   - 使用 `tree_structure` 繪製 Huffman Tree
   - 使用 `build_steps` 播放構建動畫

3. **下載**:
   - 使用 `compressed_filename` 調用 `/api/download/{filename}`

## 注意事項

- 所有文本默認使用 UTF-8 編碼
- 生產環境請修改 CORS 配置
- 上傳文件應設置合理的大小限制
- 壓縮率取決於文本的字符分佈

## 許可證

MIT
