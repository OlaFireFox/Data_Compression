/**
 * LZ77 演算法滑動視窗視覺化器
 */
class LZ77Visualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with id ${canvasId} not found`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.text = "";
        
        // 區塊繪製設定
        this.blockWidth = 32;
        this.blockHeight = 40;
        this.gap = 4;
        this.yPos = 50;
        
        // 視區中央位置 (第 8 個 block，從 0 開始算)
        this.centerBlockIdx = 8;
        this.totalVisibleBlocks = 20;

        // 拖動狀態設定
        this.dragOffset = 0;
        this.isDragging = false;
        this.startX = 0;
        this.startDragOffset = 0;
        this.lastStep = null;

        // 設定畫布預設游標
        this.canvas.style.cursor = 'grab';

        // 註冊拖拽事件
        this.initDragEvents();
    }

    initDragEvents() {
        // 滑鼠事件
        this.canvas.addEventListener('mousedown', (e) => this.handleDragStart(e.clientX));
        this.canvas.addEventListener('mousemove', (e) => this.handleDragMove(e.clientX));
        this.canvas.addEventListener('mouseup', () => this.handleDragEnd());
        this.canvas.addEventListener('mouseleave', () => this.handleDragEnd());

        // 觸控事件
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.handleDragStart(e.touches[0].clientX);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                this.handleDragMove(e.touches[0].clientX);
            }
        }, { passive: true });

        this.canvas.addEventListener('touchend', () => this.handleDragEnd());
    }

    handleDragStart(clientX) {
        if (!this.lastStep) return;
        this.isDragging = true;
        this.startX = clientX;
        this.startDragOffset = this.dragOffset;
        this.canvas.style.cursor = 'grabbing';
    }

    handleDragMove(clientX) {
        if (!this.isDragging || !this.lastStep) return;
        const dx = clientX - this.startX;
        const blockSize = this.blockWidth + this.gap;
        const currentIndex = this.lastStep.index;
        
        // 計算目標視區起點字元索引
        const targetViewStartIdx = currentIndex - this.centerBlockIdx + this.startDragOffset - (dx / blockSize);
        
        // 限制視區起點索引範圍：最左能拉到 0 (文字最起點)，最右能拉到最後一個字元
        const minStartIdx = 0;
        const maxStartIdx = Math.max(0, this.text.length - 1);
        const clampedStartIdx = Math.max(minStartIdx, Math.min(maxStartIdx, targetViewStartIdx));
        
        // 反推對應的 dragOffset
        this.dragOffset = clampedStartIdx - (currentIndex - this.centerBlockIdx);
        
        this.draw(this.lastStep);
    }

    handleDragEnd() {
        if (this.isDragging) {
            this.isDragging = false;
            this.canvas.style.cursor = 'grab';
        }
    }

    setText(text) {
        this.text = text;
    }

    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * 繪製指定步驟的滑動視窗狀態
     */
    draw(step) {
        if (!this.ctx || !this.canvas || !this.text) return;
        if (!step) return;
        
        // 儲存當前步驟以利拖拽時重繪
        this.lastStep = step;
        
        // 如果不是在拖動狀態，則自動重設偏移量（自動定位）
        if (!this.isDragging) {
            this.dragOffset = 0;
        }
        
        this.clear();
        
        const ctx = this.ctx;
        const currentIndex = step.index;
        const searchStart = step.search_start;
        const searchEnd = step.search_end;
        const lookaheadStart = step.lookahead_start;
        const lookaheadEnd = step.lookahead_end;
        const matchOffset = step.match_offset;
        const matchLength = step.match_length;
        
        // 計算視區起點字元浮點索引
        const floatViewStartIdx = currentIndex - this.centerBlockIdx + this.dragOffset;
        const viewStartIdx = Math.floor(floatViewStartIdx);
        const fracShift = (floatViewStartIdx - viewStartIdx) * (this.blockWidth + this.gap);
        
        // 1. 繪製區塊與文字（多畫一塊以覆蓋右側邊界）
        for (let i = 0; i <= this.totalVisibleBlocks; i++) {
            const charIdx = viewStartIdx + i;
            
            // 計算區塊 X 座標（套用小數偏移）
            const x = i * (this.blockWidth + this.gap) + 15 - fracShift;
            const y = this.yPos;
            
            // 檢查該字元是否在文字範圍內
            const isLightTheme = document.body.classList.contains('light-theme');
            
            if (charIdx < 0 || charIdx >= this.text.length) {
                // 繪製空區塊
                ctx.fillStyle = isLightTheme ? "#e2e8f0" : "#1e293b"; // slate-200 或 slate-800
                ctx.strokeStyle = isLightTheme ? "#cbd5e1" : "#334155"; // slate-300 或 slate-700
                ctx.lineWidth = 1;
                this.roundRect(ctx, x, y, this.blockWidth, this.blockHeight, 4, true, true);
                continue;
            }
            
            const char = this.text[charIdx];
            
            // 2. 判斷區塊顏色 (搜尋區/先行區/普通)
            let isSearch = charIdx >= searchStart && charIdx < searchEnd;
            let isLookahead = charIdx >= lookaheadStart && charIdx < lookaheadEnd;
            let isCurrent = charIdx === currentIndex;
            
            // 設定填滿與框線樣式
            if (isCurrent) {
                ctx.fillStyle = isLightTheme ? "rgba(13, 148, 136, 0.2)" : "rgba(20, 184, 166, 0.25)"; // teal-600 / teal-500
                ctx.strokeStyle = isLightTheme ? "#0d9488" : "#14b8a6"; // teal-600 / teal-500
                ctx.lineWidth = 2.5;
            } else if (isSearch) {
                // 檢查是否為匹配成功的字元
                let isMatched = false;
                if (matchLength > 0 && matchOffset > 0) {
                    const matchStartIdx = currentIndex - matchOffset;
                    isMatched = charIdx >= matchStartIdx && charIdx < matchStartIdx + matchLength;
                }
                
                if (isMatched) {
                    ctx.fillStyle = isLightTheme ? "rgba(22, 163, 74, 0.3)" : "rgba(16, 185, 129, 0.4)"; // green-600 / emerald-500
                    ctx.strokeStyle = isLightTheme ? "#16a34a" : "#34d399"; // green-600 / emerald-400
                    ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = isLightTheme ? "rgba(13, 148, 136, 0.08)" : "rgba(13, 148, 136, 0.15)";
                    ctx.strokeStyle = isLightTheme ? "rgba(13, 148, 136, 0.4)" : "rgba(13, 148, 136, 0.6)"; 
                    ctx.lineWidth = 1;
                }
            } else if (isLookahead) {
                // 檢查是否為被匹配的字元
                let isMatched = matchLength > 0 && charIdx >= currentIndex && charIdx < currentIndex + matchLength;
                
                if (isMatched) {
                    ctx.fillStyle = isLightTheme ? "rgba(37, 99, 235, 0.3)" : "rgba(59, 130, 246, 0.4)"; // blue-600 / blue-500
                    ctx.strokeStyle = isLightTheme ? "#2563eb" : "#60a5fa"; // blue-600 / blue-400
                    ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = isLightTheme ? "rgba(37, 99, 235, 0.08)" : "rgba(37, 99, 235, 0.15)";
                    ctx.strokeStyle = isLightTheme ? "rgba(37, 99, 235, 0.4)" : "rgba(37, 99, 235, 0.6)";
                    ctx.lineWidth = 1;
                }
            } else {
                ctx.fillStyle = isLightTheme ? "#ffffff" : "#1e293b"; // 白色 或 slate-800
                ctx.strokeStyle = isLightTheme ? "#cbd5e1" : "#475569"; // slate-300 或 slate-600
                ctx.lineWidth = 1;
            }
            
            // 繪製圓角矩陣區塊
            this.roundRect(ctx, x, y, this.blockWidth, this.blockHeight, 4, true, true);
            
            // 3. 繪製文字
            ctx.fillStyle = isCurrent 
                ? (isLightTheme ? "#0f766e" : "#5eead4") 
                : (isLightTheme ? "#0f172a" : "#f1f5f9"); // 深綠/淺青 或 深灰/淺白
            ctx.font = "bold 14px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            
            // 處理空白字元顯示
            let displayChar = char;
            if (char === ' ') displayChar = "⎵";
            else if (char === '\n') displayChar = "↵";
            else if (char === '\t') displayChar = "⇥";
            
            ctx.fillText(displayChar, x + this.blockWidth / 2, y + this.blockHeight / 2);
            
            // 4. 標記文字索引
            ctx.fillStyle = isLightTheme ? "#64748b" : "#94a3b8"; // slate-500 或 slate-400
            ctx.font = "8px monospace";
            ctx.fillText(charIdx.toString(), x + this.blockWidth / 2, y + this.blockHeight + 10);
        }
        
        // 5. 標記區域名稱 (Search Buffer / Lookahead Buffer)
        ctx.fillStyle = isLightTheme ? "#0f766e" : "#14b8a6"; // dark teal 或 teal
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("🔍 字典搜尋區 (Search Buffer)", 15, 20);
        
        ctx.fillStyle = isLightTheme ? "#1d4ed8" : "#3b82f6"; // dark blue 或 blue
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "right";
        ctx.fillText("先行緩衝區 (Lookahead)", this.canvas.width - 15, 20);
        
        // 6. 如果有匹配成功，繪製對接箭頭線 (Curved Match Arc)
        if (matchLength > 0 && matchOffset > 0) {
            const matchStartInSearch = currentIndex - matchOffset;
            
            // 使用浮點數視角計算匹配字串中心與先行區匹配字串中心的 Canvas X 座標 (實現拖動時線條平滑滾動)
            const searchIndexInView = matchStartInSearch - floatViewStartIdx + (matchLength - 1) / 2;
            const lookaheadIndexInView = currentIndex - floatViewStartIdx + (matchLength - 1) / 2;
            
            const startX = searchIndexInView * (this.blockWidth + this.gap) + 15 + this.blockWidth / 2;
            const endX = lookaheadIndexInView * (this.blockWidth + this.gap) + 15 + this.blockWidth / 2;
            
            // 確保座標在視窗範圍內才繪製
            if (startX >= 0 && startX < this.canvas.width || endX >= 0 && endX < this.canvas.width) {
                const topY = this.yPos;
                
                // 畫二次貝氏曲線箭頭
                ctx.beginPath();
                ctx.strokeStyle = "#10b981"; // emerald-500
                ctx.lineWidth = 2;
                ctx.setLineDash([4, 2]); // 虛線
                
                ctx.moveTo(startX, topY);
                
                // 控制點往上拉形成弧線
                const midX = (startX + endX) / 2;
                const cpY = topY - 35;
                ctx.quadraticCurveTo(midX, cpY, endX, topY);
                ctx.stroke();
                ctx.setLineDash([]); // 恢復實線
                
                // 繪製箭頭尾端
                ctx.fillStyle = "#10b981";
                ctx.beginPath();
                ctx.moveTo(endX, topY);
                ctx.lineTo(endX - 5, topY - 8);
                ctx.lineTo(endX + 5, topY - 8);
                ctx.closePath();
                ctx.fill();
                
                // 繪製匹配字樣
                ctx.font = "bold 10px monospace";
                ctx.textAlign = "center";
                ctx.fillStyle = "#34d399";
                ctx.fillText(`Match! Offset: ${matchOffset}, Len: ${matchLength}`, midX, cpY - 5);
            }

            // 7. 新增：相同部分用虛線從下方連起的效果
            const bottomY = this.yPos + this.blockHeight;
            const isLightTheme = document.body.classList.contains('light-theme');
            
            for (let k = 0; k < matchLength; k++) {
                const sourceIdx = matchStartInSearch + k;
                const destIdx = currentIndex + k;
                
                // 計算各個字元的中心 X 座標
                const sX = (sourceIdx - floatViewStartIdx) * (this.blockWidth + this.gap) + 15 + this.blockWidth / 2;
                const dX = (destIdx - floatViewStartIdx) * (this.blockWidth + this.gap) + 15 + this.blockWidth / 2;
                
                // 只要起點或終點在畫布範圍內即進行繪製
                if ((sX >= 0 && sX <= this.canvas.width) || (dX >= 0 && dX <= this.canvas.width)) {
                    ctx.beginPath();
                    ctx.strokeStyle = isLightTheme ? "rgba(16, 185, 129, 0.5)" : "rgba(52, 211, 153, 0.5)"; // 半透明綠色
                    ctx.lineWidth = 1.2;
                    ctx.setLineDash([2, 2]); // 細虛線
                    
                    ctx.moveTo(sX, bottomY);
                    
                    const midX = (sX + dX) / 2;
                    // 下拉弧度隨距離稍微拉深，並限制最大高度避免超出畫布底部
                    const cpY = bottomY + 12 + Math.min(20, (dX - sX) * 0.08);
                    
                    ctx.quadraticCurveTo(midX, cpY, dX, bottomY);
                    ctx.stroke();
                }
            }
            ctx.setLineDash([]); // 恢復實線
        }
    }

    /**
     * 繪製圓角矩形輔助函數
     */
    roundRect(ctx, x, y, width, height, radius, fill, stroke) {
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = {tl: radius, tr: radius, br: radius, bl: radius};
        } else {
            var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
            for (var side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
    }
}
