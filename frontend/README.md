# 前端應用文檔

現代化的 Web 前端，用於與 Huffman 壓縮演算法後端互動，支援完整的可視化體驗。

## 快速開始

```bash
# 進入前端目錄
cd frontend

# 啟動前端服務（運行在 http://localhost:3000）
python server.py
```

確保後端服務已在另一個終端運行：
```bash
cd backend
python run.py  # 運行在 http://localhost:8000
```

## 📁 項目結構

```
frontend/
├── index.html              # 主 HTML 頁面
├── server.py               # 前端靜態文件服務器
├── css/
│   └── style.css          # Tailwind CSS 樣式
├── js/
│   ├── main.js            # 主應用邏輯
│   ├── api.js             # API 通信層
│   ├── visualization.js   # Huffman 樹可視化
│   └── animation.js       # 動畫效果
└── README.md              # 本文檔
```

## 🎨 技術棧

- **HTML5** - 語義化標記
- **Tailwind CSS** - 實用優先的 CSS 框架（CDN）
- **Vanilla JavaScript** - 無依賴的純 JavaScript
- **Chart.js** - 字符頻率統計圖表
- **Canvas API** - Huffman 樹的動態繪製

## ✨ 核心功能

### 1. 檔案上傳區域
- ✅ Drag & Drop 拖放上傳
- ✅ 點擊選擇檔案
- ✅ .txt 檔案驗證
- ✅ 檔案大小限制 (10MB)

### 2. 實時狀態顯示
- ✅ 檔案預覽
- ✅ API 連線狀態檢查
- ✅ Huffman 樹構建步驟動畫
- ✅ 獨特字符統計

### 3. 壓縮結果呈現
- ✅ 原始檔案大小
- ✅ 壓縮後大小
- ✅ 壓縮率百分比
- ✅ 字符頻率柱狀圖表
- ✅ Huffman 編碼表展示

### 4. 動畫可視化
- ✅ Huffman 樹實時動態繪製
- ✅ 樹節點連接路徑動畫
- ✅ 逐步播放構建過程
- ✅ 平滑的過渡效果

## 文件說明

| 檔案 | 說明 |
|------|------|
| `index.html` | 應用主頁面，包含上傳區、結果區、樹形圖等 |
| `js/api.js` | 與後端 API 通信的接口函數 |
| `js/main.js` | 核心應用邏輯和事件處理 |
| `js/visualization.js` | Canvas 繪製 Huffman 樹的實現 |
| `js/animation.js` | 動畫效果和過渡邏輯 |
| `css/style.css` | 自訂樣式（補充 Tailwind CSS） |
| `server.py` | 簡單的靜態文件服務器，支援 CORS |

## 環境配置

### API 通信

編輯 `js/api.js` 中的 `API_BASE_URL` 來配置後端地址：

```javascript
const API_BASE_URL = 'http://localhost:8000';  // 默認本地地址
```

### CORS 設置

前端服務器已配置 CORS，允許與後端通信。如改變端口，確保後端也相應配置。

## 故障排除

### 無法連接到後端
- 檢查後端是否運行：訪問 http://localhost:8000
- 檢查 API_BASE_URL 配置是否正確
- 查看瀏覽器控制台（F12）的網絡選項卡和錯誤信息

### 樹形圖不顯示
- 確認瀏覽器支援 Canvas API
- 檢查 JavaScript 控制台是否有錯誤
- 嘗試刷新頁面

### 檔案上傳失敗
- 確認檔案格式為 .txt
- 檢查檔案大小是否超過 10MB
- 查看瀏覽器控制台的詳細錯誤信息

## 性能優化

- 使用 Tailwind CDN 進行快速加載
- 使用 Vanilla JavaScript 避免依賴開銷
- Canvas 繪製優化樹形圖性能
- 動畫使用 requestAnimationFrame 實現流暢效果

## 相關資源

- 查看 [主 README](../README.md) 了解完整項目信息
- 查看 [後端 README](../backend/README.md) 了解 API 詳情
- ✅ 可調整播放速度
- ✅ 前/後/逐步導航

### 5. 下載功能
- ✅ 下載壓縮 .bin 檔案
- ✅ 複製編碼表
- ✅ 壓縮歷史記錄

## 🚀 快速開始

### 1. 安裝
本前端只需靜態伺服器即可運行，無需 npm 依賴。

### 2. 使用 Python 的簡單伺服器
```bash
# Python 3
cd frontend
python -m http.server 3000

# 或 Python 2
python -m SimpleHTTPServer 3000
```

### 3. 使用 Node.js 的 http-server
```bash
npm install -g http-server
cd frontend
http-server -p 3000
```

### 4. 訪問
打開瀏覽器訪問：http://localhost:3000

## 📋 使用流程

1. **上傳檔案**
   - 拖放或點擊上傳 .txt 檔案
   - 顯示檔案名稱和大小

2. **開始壓縮**
   - 點擊「開始壓縮」按鈕
   - 顯示進度條
   - 後端處理完成後返回結果

3. **檢查結果**
   - 查看壓縮統計信息
   - 分析字符頻率圖表
   - 檢查生成的編碼表

4. **查看動畫**
   - 點擊「查看動畫」按鈕
   - 逐步觀看 Huffman 樹構建過程
   - 調整播放速度

5. **下載檔案**
   - 點擊「下載壓縮文件」下載 .bin 檔案
   - 或複製編碼表供其他用途

## 🔌 API 整合

### 後端連線設定
編輯 `js/api.js` 中的 `API_BASE_URL`：

```javascript
const API_BASE_URL = 'http://localhost:8000/api';
```

### API 端點對應

| 功能 | 端點 | 方法 |
|------|------|------|
| 上傳壓縮 | `/api/upload` | POST |
| 解壓縮 | `/api/decompress` | POST |
| 下載檔案 | `/api/download/{filename}` | GET |
| 查看歷史 | `/api/compression-history` | GET |
| 健康檢查 | `/health` | GET |

## 🎬 動畫說明

### HuffmanTreeVisualizer 類別

- **加載數據**: `loadData(treeData, buildSteps)`
- **繪製樹**: `drawTree(nodeIds)` - 可選高亮節點
- **顯示步驟**: `showStep(stepIndex)` - 顯示第 N 步
- **播放動畫**: `playAnimation(speed, onStepChange)` - 自動播放

### 步驟信息結構

```json
{
  "step": 1,
  "left_node": {
    "char": "a",
    "freq": 5,
    "node_id": 0,
    "is_leaf": true
  },
  "right_node": {
    "char": "b",
    "freq": 3,
    "node_id": 1,
    "is_leaf": true
  },
  "parent_node": {
    "freq": 8,
    "node_id": 2,
    "is_leaf": false
  }
}
```

## 💾 數據存儲

所有壓縮結果存儲在 `appState` 全局對象中：

```javascript
appState = {
    currentFile: File,              // 當前選中的檔案
    compressionResult: Object,      // 壓縮結果
    frequencyChart: Chart,          // Chart.js 圖表實例
    treeVisualizer: Visualizer,     # 樹可視化器
    animationPlaying: Boolean,      // 動畫播放狀態
    currentStepIndex: Number        // 當前步驟索引
}
```

## 🎨 自訂樣式

### 色彩主題
- **主色**: Blue (#3b82f6) 和 Purple (#8b5cf6)
- **背景**: Dark Slate (#0f172a) 系列
- **強調**: Green (#10b981) 和 Orange (#f97316)

### 調整方法
編輯 `css/style.css` 或在 `index.html` 中修改 Tailwind 類別。

## 🔧 瀏覽器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### 功能檢查清單
- ✅ Fetch API（檔案上傳）
- ✅ Canvas API（樹繪製）
- ✅ File API（檔案讀取）
- ✅ Blob API（檔案下載）

## 🐛 故障排除

### "無法連接到後端"
1. 確保後端伺服器運行在 http://localhost:8000
2. 檢查 CORS 配置
3. 查看瀏覽器控制台的錯誤信息

### 檔案上傳失敗
1. 確認檔案為 .txt 格式
2. 檔案大小不超過 10MB
3. 檔案內容使用 UTF-8 編碼

### 樹不顯示
1. 確保壓縮成功完成
2. 檢查 Canvas 是否被正確初始化
3. 查看瀏覽器控制台的錯誤

## 📱 響應式設計

- **桌面** (1024px+): 3 列佈局（左側 2 列、右側 1 列）
- **平板** (768px-1023px): 適應式佈局
- **手機** (<768px): 單列佈局

## ⚡ 性能優化

- CDN 加載 Tailwind CSS 和 Chart.js
- Canvas 優化的樹繪製
- 懶加載圖表
- 事件防抖

## 🔒 安全考量

- ✅ 客戶端檔案大小驗證
- ✅ 檔案類型驗證
- ✅ CORS 跨域配置
- ✅ 無本地檔案存儲

## 📚 額外資源

- [Tailwind CSS 文檔](https://tailwindcss.com/docs)
- [Chart.js 文檔](https://www.chartjs.org/docs/latest/)
- [Canvas API 文檔](https://developer.mozilla.org/zh-TW/docs/Web/API/Canvas_API)

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request。

## 📄 許可證

MIT
