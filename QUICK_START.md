# 🚀 快速開始 - 智能路徑動畫

## ⚡ 30 秒快速開始

### 1️⃣ 啟動服務 (2 個終端)

**終端 1 - 後端**：
```bash
cd c:\Users\allen\Data_Compression_Visualization\backend
source venv/Scripts/activate  # 或: venv\Scripts\activate.bat (Windows)
python -m uvicorn main:app --reload --port 8000
```

**終端 2 - 前端**：
```bash
cd c:\Users\allen\Data_Compression_Visualization\frontend
python -m http.server 3000
```

### 2️⃣ 打開瀏覽器

```
http://localhost:3000
```

### 3️⃣ 測試動畫

1. **上傳測試文件**：將以下內容保存為 `test.txt`
   ```
   aaabbc
   ```

2. **點擊「壓縮」**按鈕 → 等待完成

3. **點擊「查看動畫」** → 打開動畫模態框

4. **打開 DevTools 控制台**：F12 或 右鍵 → 檢查

5. **點擊「▶️ 播放」** → 開始！

---

## 🎯 看什麼

### 第 1 個字符 ('a') - 🔄 遞進式高亮

```
預期視覺：
├─ 根節點亮起 (黃色)
├─ 中間節點亮起 (黃色)  
└─ 葉節點 'a' 亮起 (黃色)
   ✓ 完整路徑展示
```

**控制台日誌**：
```
🔄 路徑變化 - 字符 'a':
   ✨ 步驟 1/3 - 高亮節點: 1
   ✨ 步驟 2/3 - 高亮節點: 1 → 2
   ✨ 步驟 3/3 - 高亮節點: 1 → 2 → 5
   ✓ 遞進式高亮完成
```

---

### 第 2-3 個字符 ('a', 'a') - 💫 脈衝閃爍

```
預期視覺：
├─ 快速閃爍 (亮 → 暗 → 亮 → ...)
├─ 重複 3 次
└─ 路徑保持亮起
   ✓ 相同路徑提示
```

**控制台日誌**：
```
🔁 路徑相同 - 字符 'a' (連續字符):
   💫 脈衝閃爍動畫:
      💥 脈衝 1/3
      💥 脈衝 2/3
      💥 脈衝 3/3
      ✓ 脈衝閃爍完成
```

---

### 第 4 個字符 ('b') - 🔄 路徑改變

```
預期視覺：
├─ 舊路徑消失 (清除高亮)
├─ 新路徑逐步亮起
└─ 完整新路徑展示
   ✓ 明確的切換效果
```

**控制台日誌**：
```
🔄 路徑變化 - 字符 'b':
   舊路徑: 1 → 2 → 5
   新路徑: 1 → 3 → 4
   ✓ 遞進式高亮完成
```

---

## 🎮 互動功能

### 速度滑塊

**位置**：動畫模態框右側「速度」

```
← 0.5x (慢)  1.0x (正常)  2.0x (快) →

效果：
├─ 0.5x：動畫放慢一倍（600ms 脈衝）
├─ 1.0x：標準速度（300ms 脈衝）
└─ 2.0x：動畫加快一倍（150ms 脈衝）
```

**驗證**：
1. 設置 0.5x，播放 → 看到慢動作
2. 設置 2.0x，播放 → 看到快速版本

---

## 📋 核心邏輯

### 路徑狀態追蹤

```javascript
【狀態變量】
appState.lastCharPath = null  // 上一個字符的路徑

【播放循環】
for (char in text) {
    // 1. 查詢當前字符路徑
    const currentPath = findPath(char)
    
    // 2. 對比：currentPath vs lastCharPath
    if (不同) {
        // 🔄 遞進式高亮
        highlightPathProgressive(currentPath)
    } else {
        // 💫 脈衝閃爍
        pulsePathFlash(currentPath)
    }
    
    // 3. 更新狀態
    appState.lastCharPath = currentPath
    
    // 4. 進度條動畫
    playProgressBar()
}
```

---

## 🔍 故障排查 (常見問題)

### ❓ 沒有看到任何動畫

**檢查**：
```javascript
// F12 控制台輸入
appState.treeVisualizer  // 應返回 HuffmanTreeVisualizer 對象
console.log(appState.compressionResult)  // 應有數據
```

**解決**：
1. 確保已上傳文件和壓縮
2. 確保已點擊「查看動畫」
3. 刷新頁面並重試

---

### ❓ 只看到路徑高亮，沒有脈衝

**可能原因**：
- 脈衝間隔太短（看不清）
- Canvas 更新太快

**驗證**：
```javascript
// F12 控制台手動測試
await appState.treeVisualizer.pulsePathFlash([1, 2, 5], 0.5)
// 使用 0.5x 速度看得更清楚
```

---

### ❓ 速度滑塊無效

**檢查**：
```javascript
// F12 控制台輸入
appState.animationSpeed  // 應返回 1, 0.5, 2 等
```

**解決**：
1. 確保滑塊已移動
2. 刷新頁面
3. 檢查 HTML 中滑塊 ID 是否為 `animationSpeed`

---

## 📊 效能指標

| 項目 | 預期 | 檢查方式 |
|------|------|---------|
| 幀率 | ~60fps | F12 → Performance |
| 內存 | < 50MB | F12 → Memory |
| 路徑查找 | < 5ms | 控制台時間戳 |
| 脈衝閃爍 | 300ms (1x) | 實際播放計時 |

---

## 📁 相關文件

| 文件 | 用途 |
|------|------|
| [PATH_ANIMATION_REFACTOR.md](PATH_ANIMATION_REFACTOR.md) | 完整技術文檔 |
| [UPGRADE_COMPARISON.md](UPGRADE_COMPARISON.md) | 舊版 vs 新版對比 |
| [VERIFICATION_CHECKLIST.md](VERIFICATION_CHECKLIST.md) | 完整驗證清單 |
| [visualization.js](frontend/js/visualization.js) | 動畫實現代碼 |
| [main.js](frontend/js/main.js) | 播放循環代碼 |

---

## 💡 提示

### 為更好的視覺效果

1. **調整速度**觀察不同效果
   ```
   慢速 (0.5x)：看得更清楚動畫過程
   快速 (2x)：感受高效的壓縮節奏
   ```

2. **使用不同文本測試**
   ```
   短文本 (aa bb)：看到清晰的對比
   長文本 (...many chars...)：看到完整的路徑變化序列
   ```

3. **開啟控制台監控**
   ```
   實時查看每個字符的處理過程
   對比預期和實際的輸出
   ```

---

## 🎓 學習要點

### 這個升級展示了什麼

1. **狀態管理**
   - 如何追蹤前一個字符的狀態
   - 如何利用狀態決定動畫效果

2. **條件分支**
   - 路徑不同 → 遞進式展示
   - 路徑相同 → 脈衝提示

3. **參數聯動**
   - 速度影響動畫時長
   - 動畫時長 = 固定步驟 / 速度

4. **異步編程**
   - 使用 async/await 順序執行
   - 精確控制時間流

---

## 🔄 下一步

- [ ] 驗證基本功能 (本快速開始)
- [ ] 執行完整檢查 (VERIFICATION_CHECKLIST.md)
- [ ] 提交反饋或改進建議
- [ ] 整合到教學材料

---

**✨ 準備好了嗎？開始測試吧！**

```
http://localhost:3000 → 上傳 test.txt → 壓縮 → 查看動畫 → 播放 🎬
```

