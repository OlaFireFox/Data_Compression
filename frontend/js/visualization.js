/**
 * Huffman 樹的可視化模塊
 */

class HuffmanTreeVisualizer {
    constructor(canvasId = 'treeCanvas') {
        this.canvas = document.getElementById(canvasId);
        this.treeData = null;
        this.buildSteps = [];
        this.currentStep = 0;
        this.currentAnimationId = 0;
        
        // 縮放與平移狀態
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.setupCanvas();
            this.setupPanZoom();
        }
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
        this.resetView(); // 載入新數據時自動重置視角
    }

    /**
     * 互動與縮放輔助方法
     */
    zoom(factor) {
        const oldScale = this.scale;
        let newScale = this.scale * factor;
        newScale = Math.max(0.15, Math.min(newScale, 6.0));
        
        const centerX = this.logicalWidth / 2;
        const centerY = this.logicalHeight / 2;
        
        this.offsetX = centerX - (centerX - this.offsetX) * (newScale / oldScale);
        this.offsetY = centerY - (centerY - this.offsetY) * (newScale / oldScale);
        
        this.scale = newScale;
        this.drawTree();
    }

    resetView() {
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.drawTree();
    }

    setupPanZoom() {
        if (!this.canvas) return;

        // 滑鼠拖曳事件
        this.canvas.addEventListener('mousedown', (e) => {
            if (!this.treeData) return;
            this.isDragging = true;
            this.canvas.style.cursor = 'grabbing';
            this.dragStart.x = e.clientX - this.offsetX;
            this.dragStart.y = e.clientY - this.offsetY;
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            this.offsetX = e.clientX - this.dragStart.x;
            this.offsetY = e.clientY - this.dragStart.y;
            this.drawTree();
        });

        window.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                if (this.canvas) {
                    this.canvas.style.cursor = 'grab';
                }
            }
        });

        this.canvas.addEventListener('mouseenter', () => {
            if (this.treeData) {
                this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            if (!this.isDragging && this.canvas) {
                this.canvas.style.cursor = 'default';
            }
        });

        // 觸控拖曳事件
        this.canvas.addEventListener('touchstart', (e) => {
            if (!this.treeData || e.touches.length !== 1) return;
            this.isDragging = true;
            const touch = e.touches[0];
            this.dragStart.x = touch.clientX - this.offsetX;
            this.dragStart.y = touch.clientY - this.offsetY;
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            const touch = e.touches[0];
            this.offsetX = touch.clientX - this.dragStart.x;
            this.offsetY = touch.clientY - this.dragStart.y;
            this.drawTree();
        });

        this.canvas.addEventListener('touchend', () => {
            this.isDragging = false;
        });

        // 滾輪縮放事件
        this.canvas.addEventListener('wheel', (e) => {
            if (!this.treeData) return;
            e.preventDefault();
            const zoomSpeed = 0.08;
            const delta = -e.deltaY;
            const oldScale = this.scale;
            let newScale = this.scale + (delta > 0 ? zoomSpeed : -zoomSpeed);
            newScale = Math.max(0.15, Math.min(newScale, 6.0));
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / oldScale);
            this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / oldScale);
            
            this.scale = newScale;
            this.drawTree();
        }, { passive: false });
    }

    /**
     * 繪製樹 (套用平移與縮放)
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

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // 計算樹的佈局
        const treeLayout = this.calculateLayout(this.treeData);

        // 繪製連線
        this.drawEdges(this.treeData, treeLayout, nodeIds);

        // 繪製節點
        this.drawNodes(this.treeData, treeLayout, nodeIds);

        this.ctx.restore();
    }

    /**
     * 計算樹的佈局位置 (防重疊中序定位演算法)
     */
    calculateLayout(rootNode) {
        if (!rootNode) return {};

        // 收集所有葉子節點 (In-order)
        const leaves = [];
        const getLeavesInOrder = (node) => {
            if (!node) return;
            if (node.is_leaf || (!node.left && !node.right)) {
                leaves.push(node);
                return;
            }
            if (node.left) getLeavesInOrder(node.left);
            if (node.right) getLeavesInOrder(node.right);
        };
        getLeavesInOrder(rootNode);

        if (leaves.length === 0) {
            leaves.push(rootNode);
        }

        // 定義葉子節點的水平間距 (保證完全不重疊)
        const horizontalSpacing = 68;
        const totalTreeWidth = (leaves.length - 1) * horizontalSpacing;
        
        // 樹在畫布中央對齊
        const startX = (this.logicalWidth - totalTreeWidth) / 2;

        const layout = {};

        // 遞迴計算座標
        const calculateCoords = (node, depth = 0) => {
            if (!node) return null;

            // 調整垂直間距，使其更寬敞
            const y = 40 + depth * 85;

            if (node.is_leaf || (!node.left && !node.right)) {
                const leafIndex = leaves.indexOf(node);
                const x = startX + leafIndex * horizontalSpacing;
                layout[node.node_id] = { x, y, node };
                return x;
            }

            const leftX = node.left ? calculateCoords(node.left, depth + 1) : null;
            const rightX = node.right ? calculateCoords(node.right, depth + 1) : null;

            let x;
            if (leftX !== null && rightX !== null) {
                x = (leftX + rightX) / 2;
            } else if (leftX !== null) {
                x = leftX;
            } else if (rightX !== null) {
                x = rightX;
            } else {
                x = startX;
            }

            layout[node.node_id] = { x, y, node };
            return x;
        };

        calculateCoords(rootNode, 0);
        return layout;
    }

    /**
     * 繪製邊 - 優化配色和發光效果，添加 '0' / '1' 標記
     */
    drawEdges(node, layout, highlightIds = null) {
        if (!node) return;

        const { x, y } = layout[node.node_id];

        if (node.left) {
            const leftPos = layout[node.left.node_id];
            const isHighlight = highlightIds && highlightIds.includes(node.left.node_id);
            
            // 設置邊的樣式 (調亮未啟動線條至 #64748b)
            this.ctx.strokeStyle = isHighlight ? '#00f2fe' : '#64748b';
            this.ctx.lineWidth = isHighlight ? 4.0 : 2.0;
            
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

            // 繪製分支標記 '0'
            const midX = (x + leftPos.x) / 2;
            const midY = (y + leftPos.y) / 2;
            this.ctx.save();
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            // 亮色模式下改為較深的深青色，深色模式用原本的亮青色
            this.ctx.fillStyle = document.body.classList.contains('light-theme') ? '#0891b2' : '#a5f3fc';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('0', midX - 12, midY - 2);
            this.ctx.restore();

            this.drawEdges(node.left, layout, highlightIds);
        }

        if (node.right) {
            const rightPos = layout[node.right.node_id];
            const isHighlight = highlightIds && highlightIds.includes(node.right.node_id);
            
            // 設置邊的樣式 (調亮未啟動線條至 #64748b)
            this.ctx.strokeStyle = isHighlight ? '#7028e4' : '#64748b';
            this.ctx.lineWidth = isHighlight ? 4.0 : 2.0;
            
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

            // 繪製分支標記 '1'
            const midX = (x + rightPos.x) / 2;
            const midY = (y + rightPos.y) / 2;
            this.ctx.save();
            this.ctx.shadowColor = 'transparent';
            this.ctx.shadowBlur = 0;
            // 亮色模式下改為較深的深紫色，深色模式用原本的亮紫色
            this.ctx.fillStyle = document.body.classList.contains('light-theme') ? '#7c3aed' : '#e9d5ff';
            this.ctx.font = 'bold 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('1', midX + 12, midY - 2);
            this.ctx.restore();

            this.drawEdges(node.right, layout, highlightIds);
        }
        
        // 清除陰影以免影響後續繪製
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
    }

    /**
     * 繪製節點 - 提高能見度，大字型與高對比配色
     */
    drawNodes(node, layout, highlightIds = null) {
        if (!node) return;

        const { x, y } = layout[node.node_id];
        const isHighlight = highlightIds && highlightIds.includes(node.node_id);

        // 增大節點半徑：葉節點 28，中間節點 24
        const radius = node.is_leaf ? 28 : 24;
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);

        if (node.is_leaf) {
            // 葉子節點：亮青色
            gradient.addColorStop(0, isHighlight ? '#00ffff' : '#00f2fe');
            gradient.addColorStop(1, isHighlight ? '#00d4ff' : '#0099cc');
        } else {
            // 中間節點：電光紫
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
        
        // 繪製高亮/一般外框
        this.ctx.strokeStyle = isHighlight ? '#ffff00' : '#e2e8f0';
        this.ctx.lineWidth = isHighlight ? 3.0 : 1.5;
        this.ctx.stroke();

        // 繪製文本
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        if (node.is_leaf) {
            // 葉節點：使用高對比深色字，放大字體
            this.ctx.fillStyle = '#0f172a';
            this.ctx.font = 'bold 15px sans-serif';
            const char = node.char === ' ' ? '⎵' : node.char;
            this.ctx.fillText(char, x, y - 6);
            
            this.ctx.font = 'bold 11px sans-serif';
            this.ctx.fillText(node.freq, x, y + 9);
        } else {
            // 中間節點：使用白色字，放大字體，加上陰影增加能見度
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 14px sans-serif';
            
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
            this.ctx.shadowBlur = 3;
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

        this.currentAnimationId++;
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
        this.currentAnimationId++;
        this.drawTree(nodePath);
    }

    /**
     * ⭐ 清除高亮
     */
    clearPathHighlight() {
        this.currentAnimationId++;
        this.drawTree(null);
    }

    /**
     * ⭐ 清除所有高亮
     */
    clearAllHighlights() {
        this.currentAnimationId++;
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
     * @param {number} animationId - 當前動畫序列 ID
     * @returns {Promise}
     */
    async highlightPathProgressive(nodePath, speed = 1.0, animationId) {
        if (!nodePath || nodePath.length === 0) {
            return;
        }

        const stepDuration = Math.max(100 / speed, 50); // 每個節點高亮時長（ms）
        const charDisplay = nodePath.length > 1 ? '✨' : '🔹';
        
        console.log(`📍 遞進式高亮路徑 (${nodePath.length} 節點 | ${speed}x 速度):`);

        // 清除舊高亮 (不增加 currentAnimationId 以防取消當前動畫)
        this.drawTree(null);
        await new Promise(r => setTimeout(r, 50));
        if (this.currentAnimationId !== animationId) return;

        // 逐個亮起節點
        for (let i = 0; i < nodePath.length; i++) {
            const currentPath = nodePath.slice(0, i + 1);
            console.log(`   ${charDisplay} 步驟 ${i + 1}/${nodePath.length} - 高亮節點: ${currentPath.join(' → ')}`);
            
            this.drawTree(currentPath);
            await new Promise(r => setTimeout(r, stepDuration));
            if (this.currentAnimationId !== animationId) return;
        }

        // 保持完整路徑高亮
        this.drawTree(nodePath);
        console.log(`   ✓ 遞進式高亮完成`);
    }

    /**
     * ⭐ 脈衝閃爍動畫 - 路徑相同時的特效 (僅最終的字元葉子節點閃一次)
     * @param {array} nodePath - 節點 ID 路徑
     * @param {number} speed - 播放速度倍數
     * @param {number} animationId - 當前動畫序列 ID
     * @returns {Promise}
     */
    async pulsePathFlash(nodePath, speed = 1.0, animationId) {
        if (!nodePath || nodePath.length === 0) {
            return;
        }

        // 脈衝參數根據速度調整，確保動作流暢且不刺眼
        const flashDuration = Math.max(250 / speed, 120); // 閃爍間隔（ms）

        console.log(`💫 葉子節點閃爍動畫 (${speed}x 速度 | ${flashDuration.toFixed(0)}ms):`);

        // 1. 確保完整路徑高亮
        this.drawTree(nodePath);
        await new Promise(r => setTimeout(r, flashDuration));
        if (this.currentAnimationId !== animationId) return;

        // 2. 只有最終的字元節點會閃一次：將葉子節點暗化（繪製除最後一個節點之外的路徑）
        const pathWithoutLeaf = nodePath.slice(0, -1);
        this.drawTree(pathWithoutLeaf);
        await new Promise(r => setTimeout(r, flashDuration));
        if (this.currentAnimationId !== animationId) return;

        // 3. 恢復完整路徑高亮
        this.drawTree(nodePath);
        console.log(`   ✓ 葉子節點閃爍完成`);
    }

    /**
     * ⭐ 智能路徑動畫 - 根據路徑變化選擇動畫效果
     * @param {string} char - 當前字符
     * @param {array} lastPath - 上一個字符的路徑
     * @param {number} speed - 播放速度倍數
     * @returns {Promise}
     */
    async smartPathAnimation(char, lastPath, speed = 1.0) {
        const animationId = ++this.currentAnimationId;
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
            await this.highlightPathProgressive(currentPath, speed, animationId);
        } else {
            // ✅ 路徑相同：維持亮起 + 脈衝閃爍
            console.log(`\n🔁 路徑相同 - 字符 '${charDisplay}' (連續字符):`);
            console.log(`   路徑: ${currentPath.join(' → ')}`);
            await this.pulsePathFlash(currentPath, speed, animationId);
        }

        return currentPath;
    }
}

// 導出為全局變數
window.HuffmanTreeVisualizer = HuffmanTreeVisualizer;
