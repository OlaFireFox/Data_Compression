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
     * 設置 Canvas
     */
    setupCanvas() {
        const container = this.canvas.parentElement;
        this.canvas.width = container.clientWidth - 20;
        this.canvas.height = 400;
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
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#94a3b8';
            this.ctx.fillText('無樹數據', this.canvas.width / 2 - 30, this.canvas.height / 2);
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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
            x = this.canvas.width / 2;
            xOffset = this.canvas.width / 4;
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
     * 繪製邊
     */
    drawEdges(node, layout, highlightIds = null) {
        if (!node) return;

        const { x, y } = layout[node.node_id];

        if (node.left) {
            const leftPos = layout[node.left.node_id];
            this.ctx.strokeStyle = highlightIds && highlightIds.includes(node.left.node_id) ? '#3b82f6' : '#64748b';
            this.ctx.lineWidth = highlightIds && highlightIds.includes(node.left.node_id) ? 2 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(leftPos.x, leftPos.y);
            this.ctx.stroke();
            this.drawEdges(node.left, layout, highlightIds);
        }

        if (node.right) {
            const rightPos = layout[node.right.node_id];
            this.ctx.strokeStyle = highlightIds && highlightIds.includes(node.right.node_id) ? '#8b5cf6' : '#64748b';
            this.ctx.lineWidth = highlightIds && highlightIds.includes(node.right.node_id) ? 2 : 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(rightPos.x, rightPos.y);
            this.ctx.stroke();
            this.drawEdges(node.right, layout, highlightIds);
        }
    }

    /**
     * 繪製節點
     */
    drawNodes(node, layout, highlightIds = null) {
        if (!node) return;

        const { x, y } = layout[node.node_id];

        // 判斷是否高亮
        const isHighlight = highlightIds && highlightIds.includes(node.node_id);

        // 繪製節點圓形
        const radius = node.is_leaf ? 25 : 20;
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);

        if (node.is_leaf) {
            gradient.addColorStop(0, isHighlight ? '#60a5fa' : '#3b82f6');
            gradient.addColorStop(1, isHighlight ? '#1e40af' : '#1e3a8a');
        } else {
            gradient.addColorStop(0, isHighlight ? '#c084fc' : '#a855f7');
            gradient.addColorStop(1, isHighlight ? '#6d28d9' : '#581c87');
        }

        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();

        // 繪製邊框
        this.ctx.strokeStyle = isHighlight ? '#fbbf24' : '#cbd5e1';
        this.ctx.lineWidth = isHighlight ? 2 : 1;
        this.ctx.stroke();

        // 繪製文本
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.font = 'bold 11px monospace';

        if (node.is_leaf) {
            // 葉節點顯示字符
            const char = node.char === ' ' ? '⎵' : node.char;
            this.ctx.fillText(char, x, y - 8);
            this.ctx.font = '9px monospace';
            this.ctx.fillText(node.freq, x, y + 8);
        } else {
            // 內部節點顯示頻率
            this.ctx.font = '10px monospace';
            this.ctx.fillText(node.freq, x, y);
        }

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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}

// 導出為全局變數
window.HuffmanTreeVisualizer = HuffmanTreeVisualizer;
