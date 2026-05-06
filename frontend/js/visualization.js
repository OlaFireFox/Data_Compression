/**
 * Huffman 樹的可視化模塊
 */

class HuffmanTreeVisualizer {
    constructor(canvasId = 'treeCanvas') {
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvas();
        }
        this.treeData = null;
        this.buildSteps = [];
        this.currentStep = 0;
    }

    /**
     * 設置 Canvas - 支持高 DPI 屏幕清晰渲染
     */
    setupCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        
        // 計算邏輯尺寸
        const logicalWidth = container.clientWidth - 20;
        const logicalHeight = Math.max(container.clientHeight - 20, 300);
        
        // 設置物理尺寸（用於高 DPI 清晰度）
        this.canvas.width = logicalWidth * dpr;
        this.canvas.height = logicalHeight * dpr;
        
        // 設置邏輯尺寸（用於 CSS 顯示）
        this.canvas.style.width = logicalWidth + 'px';
        this.canvas.style.height = logicalHeight + 'px';
        
        // 縮放上下文以適應高 DPI
        this.ctx.scale(dpr, dpr);
        this.logicalWidth = logicalWidth;
        this.logicalHeight = logicalHeight;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px monospace';
    }

    /**
     * 加載樹數據和構建步驟
     */
    loadData(treeData, buildSteps) {
        this.treeData = treeData;
        this.buildSteps = buildSteps;
        this.currentStep = 0;
    }

    /**
     * 繪製樹
     */
    drawTree(nodeIds = null) {
        if (!this.treeData) {
            this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.font = '14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('無樹數據', this.logicalWidth / 2, this.logicalHeight / 2);
            return;
        }

        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

        // 計算樹的佈局
        const treeLayout = this.calculateLayout(this.treeData);

        // 繪製連線
        this.drawEdges(this.treeData, treeLayout, nodeIds);

        // 繪製節點
        this.drawNodes(this.treeData, treeLayout, nodeIds);
    }

    /**
     * 計算樹的佈局位置
     */
    calculateLayout(node, x = null, y = 20, xOffset = null) {
        if (!x) {
            x = this.logicalWidth / 2;
            xOffset = this.logicalWidth / 4;
        }

        const layout = {
            [node.node_id]: { x, y, node }
        };

        if (node.left) {
            const leftLayout = this.calculateLayout(node.left, x - xOffset, y + 80, xOffset / 2);
            Object.assign(layout, leftLayout);
        }

        if (node.right) {
            const rightLayout = this.calculateLayout(node.right, x + xOffset, y + 80, xOffset / 2);
            Object.assign(layout, rightLayout);
        }

        return layout;
    }

    /**
     * 繪製邊 - 優化配色和發光效果
     */
    drawEdges(node, layout, highlightIds = null) {
        if (!node) return;

        const { x, y } = layout[node.node_id];

        if (node.left) {
            const leftPos = layout[node.left.node_id];
            const isHighlight = highlightIds && highlightIds.includes(node.left.node_id);
            
            // 設置邊的樣式
            this.ctx.strokeStyle = isHighlight ? '#00f2fe' : '#475569';
            this.ctx.lineWidth = isHighlight ? 3 : 1.5;
            
            // 高亮時添加發光效果
            if (isHighlight) {
                this.ctx.shadowColor = 'rgba(0, 242, 254, 0.6)';
                this.ctx.shadowBlur = 8;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(leftPos.x, leftPos.y);
            this.ctx.stroke();
            this.drawEdges(node.left, layout, highlightIds);
        }

        if (node.right) {
            const rightPos = layout[node.right.node_id];
            const isHighlight = highlightIds && highlightIds.includes(node.right.node_id);
            
            // 設置邊的樣式
            this.ctx.strokeStyle = isHighlight ? '#7028e4' : '#475569';
            this.ctx.lineWidth = isHighlight ? 3 : 1.5;
            
            // 高亮時添加發光效果
            if (isHighlight) {
                this.ctx.shadowColor = 'rgba(112, 40, 228, 0.6)';
                this.ctx.shadowBlur = 8;
            } else {
                this.ctx.shadowColor = 'transparent';
                this.ctx.shadowBlur = 0;
            }
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(rightPos.x, rightPos.y);
            this.ctx.stroke();
            this.drawEdges(node.right, layout, highlightIds);
        }
        
        // 清除陰影以免影響後續繪製
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    /**
     * 繪製節點 - 優化配色、發光和文字清晰度
     */
    drawNodes(node, layout, highlightIds = null) {
        if (!node) return;

        const { x, y } = layout[node.node_id];

        // 判斷是否高亮
        const isHighlight = highlightIds && highlightIds.includes(node.node_id);

        // 繪製節點圓形
        const radius = node.is_leaf ? 25 : 20;
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);

        // ✨ 新配色方案：亮青色和電光紫
        if (node.is_leaf) {
            // 葉子節點：亮青色 #00f2fe
            gradient.addColorStop(0, isHighlight ? '#00ffff' : '#00f2fe');
            gradient.addColorStop(1, isHighlight ? '#00d4ff' : '#0099cc');
        } else {
            // 中間節點：電光紫 #7028e4
            gradient.addColorStop(0, isHighlight ? '#a855f7' : '#7028e4');
            gradient.addColorStop(1, isHighlight ? '#7028e4' : '#5a1aa8');
        }

        this.ctx.fillStyle = gradient;
        
        // 高亮時添加發光效果
        if (isHighlight) {
            this.ctx.shadowColor = node.is_leaf ? 'rgba(0, 242, 254, 0.8)' : 'rgba(112, 40, 228, 0.8)';
            this.ctx.shadowBlur = 12;
            this.ctx.shadowOffsetX = 0;
            this.ctx.shadowOffsetY = 0;
        }
        
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // 清除陰影，設置邊框
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        
        // 繪製邊框
        this.ctx.strokeStyle = isHighlight ? '#ffff00' : '#e0e7ff';
        this.ctx.lineWidth = isHighlight ? 2.5 : 1.5;
        this.ctx.stroke();

        // 繪製文本 - 白色加粗，添加陰影
        this.ctx.fillStyle = '#ffffff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 12px monospace';
        
        // 文字陰影效果
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        this.ctx.shadowBlur = 3;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        if (node.is_leaf) {
            // 葉節點顯示字符
            const char = node.char === ' ' ? '⎵' : node.char;
            this.ctx.fillText(char, x, y - 8);
            this.ctx.font = 'bold 9px monospace';
            this.ctx.fillText(node.freq, x, y + 9);
        } else {
            // 內部節點顯示頻率
            this.ctx.font = 'bold 11px monospace';
            this.ctx.fillText(node.freq, x, y);
        }

        // 清除陰影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;

        // 遞迴繪製子節點
        if (node.left) {
            this.drawNodes(node.left, layout, highlightIds);
        }
        if (node.right) {
            this.drawNodes(node.right, layout, highlightIds);
        }
    }

    /**
     * 顯示特定步驟的樹
     */
    showStep(stepIndex) {
        if (stepIndex < 0 || stepIndex >= this.buildSteps.length) {
            return;
        }

        this.currentStep = stepIndex;
        const step = this.buildSteps[stepIndex];

        // 突出顯示涉及的節點
        const highlightIds = [
            step.left_node.node_id,
            step.right_node.node_id,
            step.parent_node.node_id
        ];

        this.drawTree(highlightIds);
    }

    /**
     * 播放所有動畫
     */
    async playAnimation(speed = 1, onStepChange = null) {
        const delayMs = 1000 / speed;

        for (let i = 0; i < this.buildSteps.length; i++) {
            this.showStep(i);
            if (onStepChange) {
                onStepChange(i);
            }
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }

        // 最後顯示完整的樹
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
        this.drawTree();
    }

    /**
     * 獲取當前步驟信息
     */
    getCurrentStepInfo() {
        if (this.currentStep < 0 || this.currentStep >= this.buildSteps.length) {
            return null;
        }
        return this.buildSteps[this.currentStep];
    }

    /**
     * 獲取步驟數
     */
    getStepsCount() {
        return this.buildSteps.length;
    }

    /**
     * 清空畫布
     */
    clear() {
        this.ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);
    }

    /**
     * ⭐ 查找字符的路徑 - 從根節點到目標葉子節點
     * @param {string} char - 要查找的字符
     * @returns {object} { path: [node_id1, node_id2, ...], found: true/false }
     */
    findPathToCharacter(char) {
        if (!this.treeData) {
            return { path: [], found: false };
        }

        const path = [];
        
        const search = (node) => {
            if (!node) return false;

            path.push(node.node_id);

            // 找到目標葉子節點
            if (node.is_leaf && node.char === char) {
                return true;
            }

            // 遞迴搜索左子樹
            if (node.left && search(node.left)) {
                return true;
            }

            // 遞迴搜索右子樹
            if (node.right && search(node.right)) {
                return true;
            }

            // 回溯
            path.pop();
            return false;
        };

        const found = search(this.treeData);
        console.log(`🔍 查找字符 '${char === ' ' ? '⎵' : char}':`);
        console.log(`   ${found ? '✓ 找到' : '✗ 未找到'} | 路徑節點: ${path.join(' → ')}`);

        return { path, found };
    }

    /**
     * ⭐ 取得路徑上的所有邊 (edges)
     * @param {array} nodePath - 節點 ID 路徑
     * @returns {array} 邊的對 [[parent, child], ...]
     */
    getPathEdges(nodePath) {
        const edges = [];
        for (let i = 0; i < nodePath.length - 1; i++) {
            edges.push({
                parent: nodePath[i],
                child: nodePath[i + 1]
            });
        }
        return edges;
    }

    /**
     * ⭐ 高亮路徑 (用 Canvas 重繪)
     * @param {array} nodePath - 節點 ID 路徑
     */
    highlightPath(nodePath) {
        this.drawTree(nodePath);
    }

    /**
     * ⭐ 清除高亮
     */
    clearPathHighlight() {
        this.drawTree(null);
    }

    /**
     * ⭐ 清除所有高亮
     */
    clearAllHighlights() {
        this.drawTree(null);
    }

    /**
     * ⭐ 比對兩個路徑是否相同
     * @param {array} path1 - 第一條路徑
     * @param {array} path2 - 第二條路徑
     * @returns {boolean}
     */
    arePathsEqual(path1, path2) {
        if (!path1 || !path2 || path1.length !== path2.length) return false;
        return path1.every((id, idx) => id === path2[idx]);
    }

    /**
     * ⭐ 遞進式亮起路徑 - 從根到葉依次高亮
     * @param {array} nodePath - 節點 ID 路徑
     * @param {number} speed - 播放速度倍數
     * @returns {Promise}
     */
    async highlightPathProgressive(nodePath, speed = 1.0) {
        if (!nodePath || nodePath.length === 0) {
            return;
        }

        const stepDuration = Math.max(100 / speed, 50); // 每個節點高亮時長（ms）
        const charDisplay = nodePath.length > 1 ? '✨' : '🔹';
        
        console.log(`📍 遞進式高亮路徑 (${nodePath.length} 節點 | ${speed}x 速度):`);

        // 清除舊高亮
        this.clearAllHighlights();
        await new Promise(r => setTimeout(r, 50));

        // 逐個亮起節點
        for (let i = 0; i < nodePath.length; i++) {
            const currentPath = nodePath.slice(0, i + 1);
            console.log(`   ${charDisplay} 步驟 ${i + 1}/${nodePath.length} - 高亮節點: ${currentPath.join(' → ')}`);
            
            this.drawTree(currentPath);
            await new Promise(r => setTimeout(r, stepDuration));
        }

        // 保持完整路徑高亮
        this.drawTree(nodePath);
        console.log(`   ✓ 遞進式高亮完成`);
    }

    /**
     * ⭐ 脈衝閃爍動畫 - 路徑相同時的特效
     * @param {array} nodePath - 節點 ID 路徑
     * @param {number} speed - 播放速度倍數
     * @returns {Promise}
     */
    async pulsePathFlash(nodePath, speed = 1.0) {
        if (!nodePath || nodePath.length === 0) {
            return;
        }

        // 脈衝參數根據速度調整
        const pulseDuration = Math.max(300 / speed, 150); // 總脈衝時長（ms）
        const pulseCount = 3; // 脈衝次數
        const pulseInterval = pulseDuration / (pulseCount * 2);

        console.log(`💫 脈衝閃爍動畫 (${speed}x 速度 | ${pulseDuration.toFixed(0)}ms):`);

        // 脈衝效果：快速閃爍
        for (let pulse = 0; pulse < pulseCount; pulse++) {
            console.log(`   💥 脈衝 ${pulse + 1}/${pulseCount}`);
            
            // 亮起
            this.drawTree(nodePath);
            await new Promise(r => setTimeout(r, pulseInterval));
            
            // 暗化
            this.clearAllHighlights();
            await new Promise(r => setTimeout(r, pulseInterval));
        }

        // 脈衝結束後恢復路徑高亮
        this.drawTree(nodePath);
        console.log(`   ✓ 脈衝閃爍完成`);
    }

    /**
     * ⭐ 智能路徑動畫 - 根據路徑變化選擇動畫效果
     * @param {string} char - 當前字符
     * @param {array} lastPath - 上一個字符的路徑
     * @param {number} speed - 播放速度倍數
     * @returns {Promise}
     */
    async smartPathAnimation(char, lastPath, speed = 1.0) {
        const { path: currentPath, found } = this.findPathToCharacter(char);
        
        if (!found) {
            console.warn(`⚠️ 字符 '${char}' 未找到，跳過動畫`);
            return;
        }

        const charDisplay = char === ' ' ? '⎵' : char;
        const pathsEqual = this.arePathsEqual(lastPath, currentPath);

        if (!pathsEqual) {
            // ✅ 路徑不同：清除 + 遞進式亮起
            console.log(`\n🔄 路徑變化 - 字符 '${charDisplay}':`);
            console.log(`   舊路徑: ${lastPath && lastPath.length ? lastPath.join(' → ') : '(無)'}`);
            console.log(`   新路徑: ${currentPath.join(' → ')}`);
            await this.highlightPathProgressive(currentPath, speed);
        } else {
            // ✅ 路徑相同：維持亮起 + 脈衝閃爍
            console.log(`\n🔁 路徑相同 - 字符 '${charDisplay}' (連續字符):`);
            console.log(`   路徑: ${currentPath.join(' → ')}`);
            await this.pulsePathFlash(currentPath, speed);
        }

        return currentPath;
    }
}

// 導出為全局變數
window.HuffmanTreeVisualizer = HuffmanTreeVisualizer;
