# 快速開始指南

## 📁 項目結構

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 主應用入點
│   ├── core/
│   │   ├── __init__.py
│   │   └── huffman.py          # ✨ Huffman 演算法核心實現
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py           # 🔌 API 路由定義
│   └── models/
│       ├── __init__.py
│       └── schemas.py          # 📊 Pydantic 數據模型
├── uploads/                     # 📤 上傳文件目錄
├── compressed/                  # 💾 壓縮文件目錄
├── requirements.txt             # 📦 依賴列表
├── run.py                       # ▶️ 啟動腳本
├── .env.example                 # 🔧 環境配置示例
├── sample.txt                   # 📝 測試樣本文件
└── README.md                    # 📖 詳細文檔
```

## 🚀 安裝與運行步驟

### 1. 安裝依賴
```bash
cd backend
pip install -r requirements.txt
```

### 2. 運行服務器
```bash
python run.py
```

或者使用 uvicorn:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. 訪問 API
- **Swagger UI 文檔**: http://localhost:8000/docs
- **ReDoc 文檔**: http://localhost:8000/redoc
- **健康檢查**: http://localhost:8000/health

## 🎯 核心功能

### HuffmanCoder 類別 (`huffman.py`)
```python
from app.core.huffman import HuffmanCoder

coder = HuffmanCoder()

# 1. 計算字符頻率
frequencies = coder.calculate_frequencies("hello world")

# 2. 構建 Huffman Tree
coder.build_huffman_tree(frequencies)

# 3. 生成編碼表
codes = coder.generate_codes()

# 4. 完整壓縮
encoded, metadata = coder.compress("hello world")

# 5. 解壓縮
decoded = coder.decompress(encoded)
```

**metadata 包含**:
- `frequencies`: 字符頻率表
- `code_table`: 編碼表
- `build_steps`: **構建過程的每一步** ✨
- `original_size`: 原始大小
- `encoded_size`: 壓縮後大小
- `compression_ratio`: 壓縮率

### build_steps 示例
```json
{
  "step": 1,
  "left_node": {
    "char": "e",
    "freq": 150,
    "node_id": 0,
    "is_leaf": true
  },
  "right_node": {
    "char": "t",
    "freq": 120,
    "node_id": 1,
    "is_leaf": true
  },
  "parent_node": {
    "freq": 270,
    "node_id": 2,
    "is_leaf": false
  }
}
```

## 🔌 API 端點

| 端點 | 方法 | 功能 |
|------|------|------|
| `/api/upload` | POST | 上傳 .txt 文件進行壓縮 |
| `/api/decompress` | POST | 解壓縮 |
| `/api/download/{filename}` | GET | 下載壓縮文件 |
| `/api/compression-history` | GET | 查看壓縮歷史 |
| `/health` | GET | 健康檢查 |
| `/docs` | GET | Swagger 文檔 |

## 💡 使用示例

### 上傳文件進行壓縮
```bash
curl -X POST -F "file=@sample.txt" http://localhost:8000/api/upload
```

### 解壓縮
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "encoded_text": "10110101...",
    "code_table": {"h": "00", "e": "01", ...}
  }' \
  http://localhost:8000/api/decompress
```

### 下載壓縮文件
```bash
curl http://localhost:8000/api/download/20250505_120000_compressed.bin \
  -o compressed.bin
```

## 📊 前端集成關鍵數據

### 1. 動畫數據 (build_steps)
使用 `build_steps` 數據逐步可視化 Huffman Tree 的構建過程：
- 每一步展示合併的兩個節點
- 顯示新生成的父節點
- 支持播放/暫停/逐步動畫

### 2. 樹結構 (tree_structure)
獲取完整的 Huffman Tree 結構用於最終可視化：
```json
{
  "freq": 500,
  "node_id": 10,
  "is_leaf": false,
  "left": { ... },
  "right": { ... }
}
```

### 3. 統計信息
- `original_size`: 原始文件大小（字節）
- `encoded_size`: 壓縮後大小（位）
- `compression_ratio`: 壓縮率百分比
- `frequencies`: 字符頻率表
- `code_table`: 生成的編碼表

## 🔍 測試

使用提供的 `sample.txt` 文件測試：
```bash
curl -X POST -F "file=@sample.txt" http://localhost:8000/api/upload
```

## ⚙️ 環境配置

複製 `.env.example` 為 `.env` 並根據需要修改：
```bash
cp .env.example .env
```

## 📚 文件說明

| 文件 | 功能 |
|------|------|
| `huffman.py` | Huffman 演算法實現 |
| `routes.py` | API 路由和業務邏輯 |
| `schemas.py` | 請求/回應數據模型 |
| `main.py` | FastAPI 應用配置 |
| `run.py` | 應用啟動入口 |

## 🎓 演算法原理

Huffman 編碼是一種無損數據壓縮演算法，工作流程：

1. **計算頻率**: 統計文本中每個字符出現的次數
2. **構建樹**: 反覆合併兩個最低頻率的節點，直到形成完整的二叉樹
3. **生成編碼**: 從根到葉的路徑編碼為二進位字符串
4. **編碼**: 將原文本用編碼表替換
5. **解碼**: 按照編碼表反向還原

## ✅ 檢查清單

- [x] HuffmanCoder 類別實現
- [x] 字符頻率計算
- [x] Huffman Tree 構建
- [x] 編碼表生成
- [x] **構建過程數據記錄** (for 動畫)
- [x] 文件上傳接口
- [x] 壓縮結果回傳
- [x] 文件下載接口
- [x] CORS 支持
- [x] 錯誤處理
- [x] API 文檔

## 🚨 常見問題

**Q: 為什麼壓縮後文件更大？**
A: 編碼表本身佔用空間。對於很短的文本，開銷可能超過節省。

**Q: 支持哪些編碼？**
A: 目前支持 UTF-8 編碼的文本文件。

**Q: 如何增加上傳文件大小限制？**
A: 在 `routes.py` 中修改文件上傳處理邏輯。

---

祝你使用愉快! 🎉
