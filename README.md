# Data_Compression_Visualization
This topic integrates information theory, web development, and generative AI to establish a highly interactive teaching platform for data compression principles. Make abstract algorithmic concepts intuitive and easy to understand through dynamic visualization.

## 快速開始 (Quick Start)

### 前置需求 (Prerequisites)
- Python 3.8+
- pip

### 安裝步驟 (Installation)

#### 1. 克隆或下載專案
```bash
git clone <repository-url>
cd Data_Compression_Visualization
```

#### 2. 安裝後端依賴
```bash
cd backend
pip install -r requirements.txt
```

### 啟動方法 (Running the Application)

#### 方法 1：同時啟動前後端（推薦）

**終端 1 - 啟動後端服務**
```bash
cd backend
python run.py
```
後端服務將運行在 http://localhost:8000

**終端 2 - 啟動前端服務**
```bash
cd frontend
python server.py
```
前端應用將運行在 http://localhost:3000

然後在瀏覽器中打開 http://localhost:3000 即可訪問應用。

#### 方法 2：使用 IDE 運行

**VS Code 用戶：**
1. 打開 `backend/run.py`，點擊頂部的 "Run" 按鈕或按 `F5` 啟動後端
2. 在另一個終端運行 `cd frontend && python server.py` 啟動前端

### API 文檔
啟動後端後，可以訪問 http://localhost:8000/docs 查看 Swagger API 文檔

### 項目結構
```
.
├── backend/                 # 後端 API（FastAPI）
│   ├── app/
│   │   ├── main.py         # 應用主程序
│   │   ├── api/            # API 路由
│   │   ├── core/           # 核心算法（Huffman 編碼）
│   │   └── models/         # 數據模型
│   ├── run.py              # 後端啟動文件
│   └── requirements.txt     # 依賴包列表
├── frontend/               # 前端應用（HTML/CSS/JS）
│   ├── index.html          # 主頁面
│   ├── js/                 # JavaScript 文件
│   ├── css/                # 樣式文件
│   └── server.py           # 前端服務器
└── README.md              # 本文件
```

### 功能特性
- 📊 實時數據壓縮可視化
- 🎨 動態動畫演示壓縮過程
- 📈 交互式界面展示算法運作原理
- 📱 響應式設計

### 故障排除 (Troubleshooting)

**端口已被占用：**
- 後端端口 8000 被占用：修改 `backend/run.py` 中的 `port=8000`
- 前端端口 3000 被占用：修改 `frontend/server.py` 中的 `PORT = 3000`

**CORS 錯誤：**
- 確保後端正在運行（http://localhost:8000）
- 檢查瀏覽器控制台查看具體錯誤信息

### 許可證 (License)
MIT
