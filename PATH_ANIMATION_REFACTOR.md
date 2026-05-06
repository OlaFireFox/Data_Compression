# 🎨 霍夫曼樹動畫路徑邏輯重構 - 完整指南

## 📋 重構概述

已實現「智能路徑對比」機制，根據當前字符與上一個字符的路徑是否相同，觸發不同的視覺效果：

| 情況 | 動畫效果 | 用途 |
|------|---------|------|
| **路徑不同** | 🔄 遞進式高亮 (Progressive Highlight) | 視覺上「切換」到新的編碼路徑 |
| **路徑相同** | 💫 脈衝閃爍 (Pulse Flash) | 表示壓縮引擎處理同一個字符 |

---

## 🔧 核心實現

### 1️⃣ 狀態追蹤 - `lastCharPath`

**位置**：`frontend/js/main.js` - `appState` 對象

```javascript
const appState = {
    // ... 其他狀態
    lastCharPath: null  // ⭐ 上一個字符的路徑 (節點 ID 陣列)
};
```

**初始化**：
- 播放開始時：`appState.lastCharPath = null`
- 每個字符處理後：`appState.lastCharPath = currentCharPath`

**用途**：記住上一個字符的編碼路徑，用於下一個字符的對比

---

### 2️⃣ 路徑對比邏輯

**函數**：`visualization.js` 中的 `arePathsEqual(path1, path2)`

```javascript
arePathsEqual(path1, path2) {
    if (!path1 || !path2 || path1.length !== path2.length) return false;
    return path1.every((id, idx) => id === path2[idx]);
}
```

**比對規則**：
- ✅ 路徑相同：所有節點 ID 完全相等，且順序一致
- ❌ 路徑不同：任何節點或長度不同

**示例**：
```
字符 'a': 路徑 [1, 2, 5]
字符 'a': 路徑 [1, 2, 5]  ← 相同 ✓

字符 'a': 路徑 [1, 2, 5]
字符 'b': 路徑 [1, 3, 4]  ← 不同 ✗
```

---

### 3️⃣ 遞進式高亮 - `highlightPathProgressive()`

**觸發條件**：路徑不同

**執行流程**：
```
1. 清除舊高亮 (50ms 延遲)
   └─ canvas 清空，回到初始狀態

2. 逐個亮起節點 (每個 100/speed ms)
   └─ [root] 亮起 → 等待
   └─ [root, node_2] 亮起 → 等待
   └─ [root, node_2, leaf] 亮起 → 完成

3. 保持完整路徑高亮
   └─ 顯示完整的 [root → node_2 → leaf]
```

**代碼**：
```javascript
async highlightPathProgressive(nodePath, speed = 1.0) {
    const stepDuration = Math.max(100 / speed, 50); // 每步時長
    
    // 清除舊高亮
    this.clearAllHighlights();
    await new Promise(r => setTimeout(r, 50));
    
    // 逐步高亮
    for (let i = 0; i < nodePath.length; i++) {
        const currentPath = nodePath.slice(0, i + 1);
        this.drawTree(currentPath);
        await new Promise(r => setTimeout(r, stepDuration));
    }
    
    // 保持完整路徑
    this.drawTree(nodePath);
}
```

**視覺效果**：
```
時間軸：
[0.0s]  ────────────────────────────────────
        根 (root) 首先亮起 (🟡 → 亮黃色)
        
[0.1s]  ────────────────────────────────────
        從根到中間節點的邊亮起
        中間節點高亮 (🟣 → 亮黃色)
        
[0.2s]  ────────────────────────────────────
        從中間到葉節點的邊亮起
        葉節點高亮 (🟢 → 亮黃色)
        ✓ 完整路徑展示完成
```

**速度調整**：
- 1x 速度：每步 100ms
- 2x 速度：每步 50ms
- 0.5x 速度：每步 200ms

---

### 4️⃣ 脈衝閃爍 - `pulsePathFlash()`

**觸發條件**：路徑相同（連續字符）

**執行流程**：
```
1. 快速閃爍 3 次 (總時長根據速度調整)
   └─ 亮起 (脈衝時長 / 6)
   └─ 熄滅 (脈衝時長 / 6)
   └─ 重複 3 次

2. 脈衝結束
   └─ 恢復路徑高亮 (維持不動)
```

**代碼**：
```javascript
async pulsePathFlash(nodePath, speed = 1.0) {
    const pulseDuration = Math.max(300 / speed, 150); // 總脈衝時長
    const pulseCount = 3; // 脈衝次數
    const pulseInterval = pulseDuration / (pulseCount * 2);
    
    for (let pulse = 0; pulse < pulseCount; pulse++) {
        // 亮起
        this.drawTree(nodePath);
        await new Promise(r => setTimeout(r, pulseInterval));
        
        // 熄滅
        this.clearAllHighlights();
        await new Promise(r => setTimeout(r, pulseInterval));
    }
    
    // 恢復高亮
    this.drawTree(nodePath);
}
```

**視覺效果**：
```
時間軸 (1x 速度)：
[0.0s]   路徑高亮 (亮黃色) ✨
[0.05s]  路徑熄滅 (正常) 
[0.10s]  路徑高亮 (亮黃色) ✨
[0.15s]  路徑熄滅 (正常)
[0.20s]  路徑高亮 (亮黃色) ✨
[0.25s]  路徑熄滅 (正常)
[0.30s]  ✓ 脈衝完成，路徑保持高亮
```

**速度調整**：
- 1x 速度：300ms 總時長 (3 × 50ms)
- 2x 速度：150ms 總時長 (3 × 25ms)
- 0.5x 速度：600ms 總時長 (3 × 100ms)

---

### 5️⃣ 智能路徑動畫 - `smartPathAnimation()`

**統一入口**：根據路徑變化自動選擇動畫

**代碼**：
```javascript
async smartPathAnimation(char, lastPath, speed = 1.0) {
    const { path: currentPath, found } = this.findPathToCharacter(char);
    
    if (!found) {
        console.warn(`字符 '${char}' 未找到`);
        return;
    }
    
    const pathsEqual = this.arePathsEqual(lastPath, currentPath);
    
    if (!pathsEqual) {
        // ✅ 不同：遞進式高亮
        await this.highlightPathProgressive(currentPath, speed);
    } else {
        // ✅ 相同：脈衝閃爍
        await this.pulsePathFlash(currentPath, speed);
    }
    
    return currentPath;  // 返回當前路徑供下次比對
}
```

**調用方式**（在 `main.js` 播放循環中）：
```javascript
// 執行智能動畫 + 更新路徑狀態
const currentCharPath = await appState.treeVisualizer.smartPathAnimation(
    char, 
    appState.lastCharPath, 
    speed
);

// 更新狀態
appState.lastCharPath = currentCharPath;
```

---

## 📊 動畫時序

### 完整字符序列的時間軸

**示例文本**：`aaabbc`

```
字符 1: 'a' (firstTime)
├─ 🔄 遞進式高亮：[root→node_2→leaf_a] (3步 × 100ms = 300ms)
└─ 進度條動畫 (0.8s)
   完成時刻: 300ms + 800ms = 1100ms

字符 2: 'a' (連續相同)
├─ 💫 脈衝閃爍：[root→node_2→leaf_a] (300ms)
│  ✨ 亮 (50ms) → 熄 (50ms) → 亮 (50ms) → 熄 (50ms) → 亮 (50ms) → 熄 (50ms)
└─ 進度條動畫 (0.8s)
   完成時刻: 1100ms + 300ms + 800ms = 2200ms

字符 3: 'a' (連續相同)
├─ 💫 脈衝閃爍 (300ms)
└─ 進度條動畫 (0.8s)
   完成時刻: 2200ms + 300ms + 800ms = 3300ms

字符 4: 'b' (路徑改變！)
├─ 🔄 遞進式高亮：[root→node_3→leaf_b] (300ms)
│  首先清除所有高亮 (50ms)
│  然後逐步亮起新路徑
└─ 進度條動畫 (0.8s)
   完成時刻: 3300ms + 300ms + 800ms = 4400ms

...依此類推
```

---

## 🎯 控制台輸出示例

### 播放開始
```
═══════════════════════════════════════════════════
▶️ 開始播放動畫 - 智能路徑對比模式
═══════════════════════════════════════════════════
```

### 字符 1 ('a')
```
📍 字符 1/6: 'a'
   🌳 顯示樹構建步驟 1/4
   🧠 執行路徑對比邏輯...

🔄 路徑變化 - 字符 'a':
   舊路徑: (無)
   新路徑: 1 → 2 → 5
   📍 遞進式高亮路徑 (3 節點 | 1x 速度):
      ✨ 步驟 1/3 - 高亮節點: 1
      ✨ 步驟 2/3 - 高亮節點: 1 → 2
      ✨ 步驟 3/3 - 高亮節點: 1 → 2 → 5
      ✓ 遞進式高亮完成

📍 字符: 'a' | 編碼: 0 (1 bits)
...進度條動畫...
```

### 字符 2 ('a') - 相同路徑
```
📍 字符 2/6: 'a'
   🌳 顯示樹構建步驟 1/4
   🧠 執行路徑對比邏輯...

🔁 路徑相同 - 字符 'a' (連續字符):
   路徑: 1 → 2 → 5
   💫 脈衝閃爍動畫 (1x 速度 | 300ms):
      💥 脈衝 1/3
      💥 脈衝 2/3
      💥 脈衝 3/3
      ✓ 脈衝閃爍完成

📍 字符: 'a' | 編碼: 0 (1 bits)
...進度條動畫...
```

### 字符 4 ('b') - 路徑改變
```
📍 字符 4/6: 'b'
   🌳 顯示樹構建步驟 2/4
   🧠 執行路徑對比邏輯...

🔄 路徑變化 - 字符 'b':
   舊路徑: 1 → 2 → 5
   新路徑: 1 → 3 → 4
   📍 遞進式高亮路徑 (3 節點 | 1x 速度):
      ✨ 步驟 1/3 - 高亮節點: 1
      ✨ 步驟 2/3 - 高亮節點: 1 → 3
      ✨ 步驟 3/3 - 高亮節點: 1 → 3 → 4
      ✓ 遞進式高亮完成

📍 字符: 'b' | 編碼: 10 (2 bits)
...進度條動畫...
```

---

## 🧪 測試步驟

### 1. 啟動服務
```bash
# 後端
cd backend
source venv/Scripts/activate  # Windows
python -m uvicorn main:app --reload --port 8000

# 前端 (新終端)
cd frontend
python -m http.server 3000
```

### 2. 打開瀏覽器
```
http://localhost:3000
```

### 3. 準備測試文件

**test_path_smart.txt**：
```
aaabbc
```

這個文件最適合測試：
- 字符 1-3：連續 'a' → 看到遞進 + 脈衝效果
- 字符 4-5：'b' 和 'c' → 看到路徑切換

### 4. 執行測試

1. 上傳 `test_path_smart.txt`
2. 點擊「壓縮」
3. 點擊「查看動畫」
4. 打開瀏覽器 DevTools (F12) → 控制台
5. 點擊「▶️ 播放」
6. **觀察**：
   - 🔄 樹上路徑依次亮起（第 1 個字符）
   - 💫 路徑快速脈衝閃爍（第 2-3 個字符）
   - 🔄 路徑突然改變（第 4 個字符）

### 5. 測試速度調整

滑動「速度」滑塊：
- ⬅️ 降低速度 (0.5x)：看到較慢的動畫
- ➡️ 提升速度 (2x)：看到快速的動畫

**驗證**：
- 遞進步驟數量相同，但每步時長改變
- 脈衝次數相同，但閃爍速度改變

---

## 🎨 顏色方案

| 狀態 | 顏色 | 效果 |
|------|------|------|
| 正常節點（葉） | 青色 `#00f2fe` | 基礎顏色 |
| 正常節點（中間） | 紫色 `#7028e4` | 基礎顏色 |
| 高亮節點 | 亮黃色 `#ffff00` | 邊框變色 |
| 發光效果 | 圓形漸層 | `drop-shadow(0 0 15px #ffff00)` |

---

## 📝 修改的文件

### 1. `frontend/js/visualization.js`

**新增/修改方法**：
- ✅ `clearAllHighlights()` - 清除所有高亮
- ✅ `arePathsEqual(path1, path2)` - 路徑對比
- ✅ `highlightPathProgressive(nodePath, speed)` - 遞進式高亮
- ✅ `pulsePathFlash(nodePath, speed)` - 脈衝閃爍
- ✅ `smartPathAnimation(char, lastPath, speed)` - 智能選擇動畫

### 2. `frontend/js/main.js`

**修改內容**：
- ✅ 在 `appState` 添加 `lastCharPath` 狀態變量
- ✅ 播放循環中添加 `appState.lastCharPath = null` 初始化
- ✅ 替換 `flashPathAnimation()` 調用為 `smartPathAnimation()`
- ✅ 添加 `appState.lastCharPath = currentCharPath` 狀態更新

---

## ⚙️ 參數調整

### 遞進式高亮

**位置**：`highlightPathProgressive()` 第 35 行

```javascript
const stepDuration = Math.max(100 / speed, 50); // 每個節點的時長
```

**調整**：
- 增加 100 → 更慢的遞進
- 減少 50 → 更快的遞進

### 脈衝閃爍

**位置**：`pulsePathFlash()` 第 82 行

```javascript
const pulseDuration = Math.max(300 / speed, 150); // 總脈衝時長
const pulseCount = 3; // 脈衝次數
```

**調整**：
- `pulseDuration`: 300 → 改變閃爍總長度
- `pulseCount`: 3 → 改變脈衝次數

---

## 🚀 性能優化

### 當前設計

| 組件 | 性能 | 說明 |
|------|------|------|
| 路徑查找 | O(n) | n = 樹節點數 |
| 路徑對比 | O(m) | m = 路徑長度 |
| Canvas 重繪 | ~16ms | 每幀 60fps |
| 記憶體 | ~1KB | 路徑陣列 |

### 進一步優化建議

1. **預計算所有路徑**
```javascript
constructor() {
    // ...
    this.pathCache = {};  // 緩存所有字符的路徑
}

// 初始化時計算
initializePathCache(chars) {
    for (let char of chars) {
        this.pathCache[char] = this.findPathToCharacter(char).path;
    }
}

// 使用快取
smartPathAnimation(char, lastPath, speed) {
    const currentPath = this.pathCache[char];
    // ...
}
```

2. **使用 OffscreenCanvas 預渲染**
```javascript
// 為不同的路徑狀態預先繪製
this.prerenderedStates = {};
```

---

## 📞 故障排查

### 問題 1: 路徑沒有遞進亮起

**檢查**：
```javascript
// F12 控制台
appState.treeVisualizer.highlightPathProgressive([1, 2, 5], 1.0)
```

**原因**：
- [ ] Canvas 被隱藏
- [ ] 樹數據未加載
- [ ] `drawTree()` 出錯

### 問題 2: 脈衝沒有出現

**檢查**：
```javascript
// F12 控制台
appState.treeVisualizer.pulsePathFlash([1, 2, 5], 1.0)
```

**原因**：
- [ ] `setTimeout` 被禁用
- [ ] `clearAllHighlights()` 無效
- [ ] 路徑對比邏輯失敗

### 問題 3: 速度調整不起作用

**驗證**：
```javascript
// 檢查速度值
console.log(appState.animationSpeed)

// 檢查計算
100 / appState.animationSpeed
```

---

## ✨ 總結

✅ **路徑狀態追蹤** - `lastCharPath` 變量
✅ **路徑對比邏輯** - `arePathsEqual()` 函數
✅ **遞進式高亮** - 路徑不同時自動觸發
✅ **脈衝閃爍** - 路徑相同時自動觸發
✅ **速度感聯動** - 動畫時長根據播放速度調整

**最終效果**：視覺上能感受到壓縮引擎處理不同字符時的「切換」與「重複」！

