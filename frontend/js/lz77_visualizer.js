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
        
        this.clear();
        
        const ctx = this.ctx;
        const currentIndex = step.index;
        const searchStart = step.search_start;
        const searchEnd = step.search_end;
        const lookaheadStart = step.lookahead_start;
        const lookaheadEnd = step.lookahead_end;
        const matchOffset = step.match_offset;
        const matchLength = step.match_length;
        
        // 計算視區起點字元索引 (以 currentIndex 為中心點往左移 centerBlockIdx 個區塊)
        const viewStartIdx = currentIndex - this.centerBlockIdx;
        
        // 1. 繪製區塊與文字
        for (let i = 0; i < this.totalVisibleBlocks; i++) {
            const charIdx = viewStartIdx + i;
            
            // 計算區塊 X 座標
            const x = i * (this.blockWidth + this.gap) + 15;
            const y = this.yPos;
            
            // 檢查該字元是否在文字範圍內
            if (charIdx < 0 || charIdx >= this.text.length) {
                // 繪製空區塊
                ctx.fillStyle = "#1e293b"; // slate-800
                ctx.strokeStyle = "#334155"; // slate-700
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
                ctx.fillStyle = "rgba(20, 184, 166, 0.25)"; // teal-500 semi-trans
                ctx.strokeStyle = "#14b8a6"; // teal-500
                ctx.lineWidth = 2.5;
            } else if (isSearch) {
                // 檢查是否為匹配成功的字元
                let isMatched = false;
                if (matchLength > 0 && matchOffset > 0) {
                    const matchStartIdx = currentIndex - matchOffset;
                    isMatched = charIdx >= matchStartIdx && charIdx < matchStartIdx + matchLength;
                }
                
                if (isMatched) {
                    ctx.fillStyle = "rgba(16, 185, 129, 0.4)"; // emerald-500 matched
                    ctx.strokeStyle = "#34d399"; // emerald-400
                    ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = "rgba(13, 148, 136, 0.15)"; // teal-600 search
                    ctx.strokeStyle = "rgba(13, 148, 136, 0.6)"; 
                    ctx.lineWidth = 1;
                }
            } else if (isLookahead) {
                // 檢查是否為被匹配的字元
                let isMatched = matchLength > 0 && charIdx >= currentIndex && charIdx < currentIndex + matchLength;
                
                if (isMatched) {
                    ctx.fillStyle = "rgba(59, 130, 246, 0.4)"; // blue-500 matched
                    ctx.strokeStyle = "#60a5fa"; // blue-400
                    ctx.lineWidth = 2;
                } else {
                    ctx.fillStyle = "rgba(37, 99, 235, 0.15)"; // blue-600 lookahead
                    ctx.strokeStyle = "rgba(37, 99, 235, 0.6)";
                    ctx.lineWidth = 1;
                }
            } else {
                ctx.fillStyle = "#1e293b"; // slate-800
                ctx.strokeStyle = "#475569"; // slate-600
                ctx.lineWidth = 1;
            }
            
            // 繪製圓角矩陣區塊
            this.roundRect(ctx, x, y, this.blockWidth, this.blockHeight, 4, true, true);
            
            // 3. 繪製文字
            ctx.fillStyle = isCurrent ? "#5eead4" : "#f1f5f9"; // teal-300 或 slate-100
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
            ctx.fillStyle = "#94a3b8"; // slate-400
            ctx.font = "8px monospace";
            ctx.fillText(charIdx.toString(), x + this.blockWidth / 2, y + this.blockHeight + 10);
        }
        
        // 5. 標記區域名稱 (Search Buffer / Lookahead Buffer)
        ctx.fillStyle = "#14b8a6"; // teal
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "left";
        ctx.fillText("🔍 字典搜尋區 (Search Buffer)", 15, 20);
        
        ctx.fillStyle = "#3b82f6"; // blue
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "right";
        ctx.fillText("先行緩衝區 (Lookahead)", this.canvas.width - 15, 20);
        
        // 6. 如果有匹配成功，繪製對接箭頭線 (Curved Match Arc)
        if (matchLength > 0 && matchOffset > 0) {
            const matchStartInSearch = currentIndex - matchOffset;
            
            // 計算搜尋區匹配字串中心與先行區匹配字串中心的 Canvas X 座標
            const searchIndexInView = matchStartInSearch - viewStartIdx + (matchLength - 1) / 2;
            const lookaheadIndexInView = this.centerBlockIdx + (matchLength - 1) / 2;
            
            // 確保座標在視窗範圍內
            if (searchIndexInView >= 0 && searchIndexInView < this.totalVisibleBlocks) {
                const startX = searchIndexInView * (this.blockWidth + this.gap) + 15 + this.blockWidth / 2;
                const endX = lookaheadIndexInView * (this.blockWidth + this.gap) + 15 + this.blockWidth / 2;
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
