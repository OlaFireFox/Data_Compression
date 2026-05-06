# 🚀 完整項目快速開始

## 📊 項目概述

**Huffman 壓縮可視化系統** 是一個全棧應用，集成了現代化的 Web 前端和高效的 Python 後端，提供完整的 Huffman 壓縮演算法實現和可視化體驗。

### 技術堆棧

```
前端: HTML5 + Tailwind CSS + Vanilla JavaScript + Canvas
後端: Python + FastAPI + Huffman 演算法
協議: HTTP REST API + JSON
```

## 📁 完整文件結構

```
Data_Compression_Visualization/
├── frontend/                    # 前端應用
│   ├── index.html              # 主頁面
│   ├── css/
│   │   └── style.css          # 自訂樣式
│   ├── js/
│   │   ├── main.js            # 主邏輯
│   │   ├── api.js             # API 通信
│   │   └── visualization.js   # 樹可視化
│   ├── server.py              # 開發伺服器
│   ├── README.md              # 前端文檔
│   └── lib/                   # 第三方庫（可選）
│
├── backend/                    # 後端應用
│   ├── app/
│   │   ├── main.py            # FastAPI 主應用
│   │   ├── core/
│   │   │   └── huffman.py     # Huffman 演算法
│   │   ├── api/
│   │   │   └── routes.py      # API 路由
│   │   └── models/
│   │       └── schemas.py     # 數據模型
│   ├── uploads/               # 上傳檔案目錄
│   ├── compressed/            # 壓縮檔案目錄
│   ├── requirements.txt        # Python 依賴
│   ├── run.py                 # 啟動腳本
│   ├── sample.txt             # 測試檔案
│   ├── README.md              # 後端文檔
│   └── QUICKSTART.md          # 後端快速開始
│
└── README.md                  # 項目主文檔
```

## 🔧 安裝步驟

### 第 1 步：安裝後端

#### 1.1 進入後端目錄
```bash
cd backend
```

#### 1.2 創建 Python 虛擬環境（推薦）
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 1.3 安裝依賴
```bash
pip install -r requirements.txt
```

#### 1.4 啟動後端伺服器
```bash
python run.py
```

**預期輸出**:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

訪問 API 文檔: http://localhost:8000/docs

### 第 2 步：安裝前端

#### 2.1 進入前端目錄（新終端窗口）
```bash
cd frontend
```

#### 2.2 啟動開發伺服器
```bash
# 方式 1: 使用 Python
python server.py

# 方式 2: 使用 Python http.server
python -m http.server 3000

# 方式 3: 使用 Node.js http-server
npx http-server -p 3000
```

**預期輸出**:
```
✓ 伺服器運行在: http://localhost:3000
✓ 靜態檔案目錄: ...
```

訪問前端: http://localhost:3000

## ✅ 驗證安裝

### 後端檢查
```bash
# 健康檢查
curl http://localhost:8000/health

# 預期回應:
# {"status": "healthy", "message": "API 運行正常"}
```

### 前端檢查
- 打開 http://localhost:3000 應該看到完整的 UI
- 右側面板顯示「已連線 ✓」表示後端連接成功

## 🎯 首次使用

### 步驟 1: 上傳檔案
1. 打開 http://localhost:3000
2. 拖放或點擊選擇 `backend/sample.txt`
3. 檢查檔案信息

### 步驟 2: 開始壓縮
1. 點擊「🚀 開始壓縮」按鈕
2. 等待進度條完成
3. 查看壓縮結果

### 步驟 3: 檢查結果
- 查看「原始大小」和「壓縮後」的對比
- 查看「字符頻率統計」圖表
- 查看生成的「編碼表」

### 步驟 4: 查看動畫
1. 點擊「🎬 查看動畫」按鈕
2. 點擊「▶️ 播放」自動播放
3. 或使用「上一步」/「下一步」手動逐步觀看
4. 調整「播放速度」

### 步驟 5: 下載結果
1. 點擊「💾 下載壓縮文件 (.bin)」下載二進位檔案
2. 或點擊「複製」複製編碼表

## 📊 API 端點參考

### 壓縮檔案
```bash
curl -X POST -F "file=@backend/sample.txt" http://localhost:8000/api/upload
```

**回應範例**:
```json
{
  "success": true,
  "message": "檔案壓縮成功",
  "encoded_text": "10110101...",
  "original_size": 1000,
  "encoded_size": 642,
  "compression_ratio": 36.5,
  "frequencies": {"a": 150, "b": 120, ...},
  "code_table": {"a": "00", "b": "01", ...},
  "build_steps": [...]
}
```

### 解壓縮
```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "encoded_text": "10110101...",
    "code_table": {"a": "00", "b": "01", ...}
  }' \
  http://localhost:8000/api/decompress
```

### 查看壓縮歷史
```bash
curl http://localhost:8000/api/compression-history
```

## 🔌 CORS 配置

如果前端和後端在不同域名運行，需要配置 CORS。

編輯 `backend/app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📝 自訂配置

### 後端配置
編輯 `backend/.env`:
```
HOST=0.0.0.0
PORT=8000
DEBUG=True
MAX_UPLOAD_SIZE=10485760
```

### 前端配置
編輯 `frontend/js/api.js`:
```javascript
const API_BASE_URL = 'http://your-api-host:8000/api';
```

## 🐛 常見問題

### Q: "無法連接到後端"
**A**: 
1. 確保後端運行在 http://localhost:8000
2. 檢查防火牆設定
3. 查看瀏覽器控制台 (F12) 的錯誤信息

### Q: 檔案上傳失敗
**A**:
1. 確認檔案為 .txt 格式
2. 檔案大小不超過 10MB
3. 檔案使用 UTF-8 編碼

### Q: 樹不顯示
**A**:
1. 確保壓縮成功完成
2. 打開瀏覽器控制台檢查錯誤
3. 確保 Canvas API 被支持

### Q: 如何使用我自己的檔案？
**A**:
1. 確保檔案格式為 .txt
2. 使用 UTF-8 編碼保存
3. 在前端上傳即可

## 📦 部署指南

### 部署後端到 Heroku

```bash
cd backend
heroku login
heroku create your-app-name
git push heroku main
```

### 部署前端到 Vercel

```bash
cd frontend
npm install -g vercel
vercel
```

### 部署到 Docker

```bash
# 後端 Dockerfile
docker build -t huffman-backend ./backend
docker run -p 8000:8000 huffman-backend

# 前端 Docker
docker build -t huffman-frontend ./frontend
docker run -p 3000:3000 huffman-frontend
```

## 🧪 測試

### 後端測試
```bash
cd backend
pytest tests/
```

### 前端測試
```bash
cd frontend
npm test
```

## 📚 進階使用

### 自訂演算法
編輯 `backend/app/core/huffman.py` 的 `HuffmanCoder` 類別

### 自訂 UI
編輯 `frontend/index.html` 和 `frontend/css/style.css`

### 新增 API 端點
編輯 `backend/app/api/routes.py`

## 🎓 學習資源

- [Huffman 編碼演算法](https://en.wikipedia.org/wiki/Huffman_coding)
- [FastAPI 文檔](https://fastapi.tiangolo.com/)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Canvas API 文檔](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## 🤝 貢獻指南

歡迎提交 Issue 和 Pull Request！

## 📄 許可證

MIT License

---

**需要幫助？** 查看 `backend/README.md` 和 `frontend/README.md` 獲取更多詳細信息。

**祝你使用愉快！** 🎉
