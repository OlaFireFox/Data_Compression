/**
 * JPEG/DCT Image Compression Visualizer JS
 */

// Standard JPEG Zig-zag sequence
const ZIGZAG_ORDER = [
    [0,0], [0,1], [1,0], [2,0], [1,1], [0,2], [0,3], [1,2],
    [2,1], [3,0], [4,0], [3,1], [2,2], [1,3], [0,4], [0,5],
    [1,4], [2,3], [3,2], [4,1], [5,0], [6,0], [5,1], [4,2],
    [3,3], [2,4], [1,5], [0,6], [0,7], [1,6], [2,5], [3,4],
    [4,3], [5,2], [6,1], [7,0], [7,1], [6,2], [5,3], [4,4],
    [3,5], [2,6], [1,7], [2,7], [3,6], [4,5], [5,4], [6,3],
    [7,2], [7,3], [6,4], [5,5], [4,6], [3,7], [4,7], [5,6],
    [6,5], [7,4], [7,5], [6,6], [5,7], [6,7], [7,6], [7,7]
];

class ImageVisualizer {
    constructor() {
        this.originalCanvas = document.getElementById('originalCanvas');
        this.gridOverlayCanvas = document.getElementById('gridOverlayCanvas');
        this.reconstructedImage = document.getElementById('reconstructedImage');
        
        this.ctxOrig = this.originalCanvas.getContext('2d');
        this.ctxOverlay = this.gridOverlayCanvas.getContext('2d');
        
        this.imageLoaded = false;
        this.imageWidth = 0;
        this.imageHeight = 0;
        
        // Grid selection states
        this.hoveredBlock = { row: -1, col: -1 };
        this.selectedBlock = { row: 0, col: 0 };
        this.blocksX = 0;
        this.blocksY = 0;
        this.showGridLines = false; // 是否顯示方塊分割線
        
        // Zig-zag scan states
        this.zigzagCanvas = document.getElementById('zigzagCanvas');
        this.ctxZigzag = this.zigzagCanvas.getContext('2d');
        this.zigzagIndex = 0;
        this.zigzagPlaying = false;
        this.zigzagInterval = null;
        this.zigzagData = []; // 64 values of the selected block
        
        this.setupEvents();
    }
    
    setupEvents() {
        // Hover/Click events on the grid overlay
        this.originalCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.originalCanvas.addEventListener('mouseleave', () => this.handleMouseLeave());
        this.originalCanvas.addEventListener('click', (e) => this.handleMouseClick(e));
        
        // 分割線切換
        const showGridLinesCheckbox = document.getElementById('showGridLinesCheckbox');
        if (showGridLinesCheckbox) {
            this.showGridLines = showGridLinesCheckbox.checked;
            showGridLinesCheckbox.addEventListener('change', (e) => {
                this.showGridLines = e.target.checked;
                this.drawGrid();
            });
        }

        // Zig-zag controls
        document.getElementById('zigzagPlayBtn').addEventListener('click', () => this.toggleZigzagPlay());
        document.getElementById('zigzagStepBtn').addEventListener('click', () => this.stepZigzag());
    }
    
    loadImage(src, callback) {
        const img = new Image();
        img.onload = () => {
            // Crop dimensions to multiple of 8
            const w = img.width - (img.width % 8);
            const h = img.height - (img.height % 8);
            this.imageWidth = Math.max(8, w);
            this.imageHeight = Math.max(8, h);
            
            this.blocksX = this.imageWidth / 8;
            this.blocksY = this.imageHeight / 8;
            
            // Set canvas dimensions
            this.originalCanvas.width = this.imageWidth;
            this.originalCanvas.height = this.imageHeight;
            this.gridOverlayCanvas.width = this.imageWidth;
            this.gridOverlayCanvas.height = this.imageHeight;
            
            // Sync styling sizes
            this.gridOverlayCanvas.style.width = this.originalCanvas.style.width;
            this.gridOverlayCanvas.style.height = this.originalCanvas.style.height;
            
            // Draw cropped image
            this.ctxOrig.clearRect(0, 0, this.imageWidth, this.imageHeight);
            this.ctxOrig.drawImage(img, 0, 0, this.imageWidth, this.imageHeight);
            
            this.imageLoaded = true;
            this.selectedBlock = { row: 0, col: 0 };
            
            this.drawGrid();
            
            if (callback) callback();
        };
        img.src = src;
    }
    
    drawGrid() {
        if (!this.imageLoaded) return;
        
        const ctx = this.ctxOverlay;
        ctx.clearRect(0, 0, this.imageWidth, this.imageHeight);
        
        // Draw grid lines (only if showGridLines is enabled)
        if (this.showGridLines) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 0.5;
            
            // Vertical lines
            for (let x = 8; x < this.imageWidth; x += 8) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.imageHeight);
                ctx.stroke();
            }
            
            // Horizontal lines
            for (let y = 8; y < this.imageHeight; y += 8) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.imageWidth, y);
                ctx.stroke();
            }
        }
        
        // Draw hover block (Orange outline)
        if (this.hoveredBlock.row >= 0 && this.hoveredBlock.col >= 0) {
            ctx.strokeStyle = '#f97316'; // Orange
            ctx.lineWidth = 1.5;
            ctx.strokeRect(this.hoveredBlock.col * 8, this.hoveredBlock.row * 8, 8, 8);
        }
        
        // Draw selected block (Green glow)
        if (this.selectedBlock.row >= 0 && this.selectedBlock.col >= 0) {
            ctx.strokeStyle = '#10b981'; // Emerald Green
            ctx.lineWidth = 2.0;
            ctx.strokeRect(this.selectedBlock.col * 8, this.selectedBlock.row * 8, 8, 8);
            
            // Soft transparent fill for selected block
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(this.selectedBlock.col * 8, this.selectedBlock.row * 8, 8, 8);
        }
    }
    
    getCoordsFromEvent(e) {
        const rect = this.originalCanvas.getBoundingClientRect();
        const scaleX = this.originalCanvas.width / rect.width;
        const scaleY = this.originalCanvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const col = Math.floor(x / 8);
        const row = Math.floor(y / 8);
        
        return {
            col: Math.max(0, Math.min(this.blocksX - 1, col)),
            row: Math.max(0, Math.min(this.blocksY - 1, row))
        };
    }
    
    handleMouseMove(e) {
        if (!this.imageLoaded) return;
        
        const coords = this.getCoordsFromEvent(e);
        
        if (coords.row !== this.hoveredBlock.row || coords.col !== this.hoveredBlock.col) {
            this.hoveredBlock = coords;
            document.getElementById('hoverCoords').innerText = `滑鼠位置: 行 ${coords.row}, 列 ${coords.col}`;
            this.drawGrid();
        }
    }
    
    handleMouseLeave() {
        if (!this.imageLoaded) return;
        this.hoveredBlock = { row: -1, col: -1 };
        document.getElementById('hoverCoords').innerText = `滑鼠位置: -`;
        this.drawGrid();
    }
    
    handleMouseClick(e) {
        if (!this.imageLoaded) return;
        
        const coords = this.getCoordsFromEvent(e);
        this.selectedBlock = coords;
        
        document.getElementById('blockInfo').innerText = `選中區塊: 行 ${coords.row}, 列 ${coords.col}`;
        this.drawGrid();
        
        // Dispatch custom event to trigger backend fetch of details
        const event = new CustomEvent('blockSelected', { detail: coords });
        window.dispatchEvent(event);
    }
    
    renderMatrix(containerId, data, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        // Find max absolute value to scale color opacity
        let maxVal = 1;
        if (type === 'dct' || type === 'dequant' || type === 'quantized') {
            maxVal = Math.max(...data.flat().map(v => Math.abs(v)));
            if (maxVal === 0) maxVal = 1;
        }
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const val = data[r][c];
                const cell = document.createElement('div');
                cell.className = 'matrix-cell';
                cell.id = `${containerId}-cell-${r}-${c}`;
                
                // Set formatting
                if (type === 'dct' || type === 'dequant') {
                    cell.innerText = Math.round(val);
                } else {
                    cell.innerText = val;
                }
                
                // Color mapping
                if (type === 'pixel') {
                    // Grayscale physical representation
                    cell.style.backgroundColor = `rgb(${val}, ${val}, ${val})`;
                    cell.style.color = val > 128 ? '#0f172a' : '#f8fafc';
                    cell.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                } else {
                    if (val === 0) {
                        cell.classList.add('matrix-cell-zero');
                    } else if (val > 0) {
                        cell.classList.add('matrix-cell-pos');
                        // Scale color intensity based on size
                        const ratio = Math.abs(val) / maxVal;
                        cell.style.backgroundColor = `rgba(59, 130, 246, ${Math.max(0.1, ratio * 0.6)})`;
                    } else {
                        cell.classList.add('matrix-cell-neg');
                        const ratio = Math.abs(val) / maxVal;
                        cell.style.backgroundColor = `rgba(139, 92, 246, ${Math.max(0.1, ratio * 0.6)})`;
                    }
                }
                
                container.appendChild(cell);
            }
        }
    }
    
    setZigzagData(zigzagArray) {
        this.zigzagData = zigzagArray;
        this.stopZigzag();
        this.zigzagIndex = 0;
        this.renderZigzagArrayUI();
        this.drawZigzagCanvas();
    }
    
    renderZigzagArrayUI() {
        const container = document.getElementById('zigzagArrayContainer');
        container.innerHTML = '';
        
        const grid = document.createElement('div');
        grid.className = 'flex flex-wrap gap-1';
        
        this.zigzagData.forEach((val, idx) => {
            const el = document.createElement('span');
            el.className = 'px-1.5 py-0.5 rounded font-mono text-[9px] bg-slate-900 border border-slate-800 text-slate-400 select-none';
            el.id = `zigzag-array-item-${idx}`;
            el.innerText = val;
            grid.appendChild(el);
        });
        
        container.appendChild(grid);
        this.highlightZigzagStep();
    }
    
    highlightZigzagStep() {
        // Highlight step numbers
        document.getElementById('zigzagIndexText').innerText = this.zigzagIndex;
        document.getElementById('zigzagValueText').innerText = this.zigzagData[this.zigzagIndex] !== undefined ? this.zigzagData[this.zigzagIndex] : '-';
        
        // Remove previous highlights
        document.querySelectorAll('.matrix-cell-highlight').forEach(el => el.classList.remove('matrix-cell-highlight'));
        document.querySelectorAll('[id^="zigzag-array-item-"]').forEach(el => {
            el.classList.remove('bg-emerald-500', 'text-slate-950', 'font-bold');
            el.classList.add('bg-slate-900', 'text-slate-400');
        });
        
        // Add new highlights
        const [r, c] = ZIGZAG_ORDER[this.zigzagIndex];
        const cell = document.getElementById(`matrixQuantized-cell-${r}-${c}`);
        if (cell) {
            cell.classList.add('matrix-cell-highlight');
        }
        
        const arrayItem = document.getElementById(`zigzag-array-item-${this.zigzagIndex}`);
        if (arrayItem) {
            arrayItem.classList.remove('bg-slate-900', 'text-slate-400');
            arrayItem.classList.add('bg-emerald-500', 'text-slate-950', 'font-bold');
            
            // Scroll into view
            arrayItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
    
    drawZigzagCanvas() {
        const ctx = this.ctxZigzag;
        const w = this.zigzagCanvas.width;
        const h = this.zigzagCanvas.height;
        const cellSize = w / 8;
        
        ctx.clearRect(0, 0, w, h);
        
        // 1. Draw 8x8 background cells
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
        
        // 2. Draw scanned cells (soft green fill)
        for (let i = 0; i <= this.zigzagIndex; i++) {
            const [r, c] = ZIGZAG_ORDER[i];
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
        }
        
        // 3. Draw zigzag path line
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Highlighted scanned path
        ctx.strokeStyle = '#10b981'; // Emerald Green
        for (let i = 0; i <= this.zigzagIndex; i++) {
            const [r, c] = ZIGZAG_ORDER[i];
            const px = c * cellSize + cellSize / 2;
            const py = r * cellSize + cellSize / 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        
        // Faint remaining path
        if (this.zigzagIndex < 63) {
            ctx.beginPath();
            ctx.lineWidth = 1.0;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.setLineDash([2, 2]);
            const [sr, sc] = ZIGZAG_ORDER[this.zigzagIndex];
            ctx.moveTo(sc * cellSize + cellSize / 2, sr * cellSize + cellSize / 2);
            
            for (let i = this.zigzagIndex + 1; i < 64; i++) {
                const [r, c] = ZIGZAG_ORDER[i];
                ctx.lineTo(c * cellSize + cellSize / 2, r * cellSize + cellSize / 2);
            }
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash
        }
        
        // 4. Draw current pointer node (Glow orange circle)
        const [cr, cc] = ZIGZAG_ORDER[this.zigzagIndex];
        const cx = cc * cellSize + cellSize / 2;
        const cy = cr * cellSize + cellSize / 2;
        
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#f97316'; // Orange
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    toggleZigzagPlay() {
        const btn = document.getElementById('zigzagPlayBtn');
        if (this.zigzagPlaying) {
            this.stopZigzag();
        } else {
            this.zigzagPlaying = true;
            btn.innerText = '⏸️ 暫停掃描';
            btn.classList.replace('bg-blue-600', 'bg-red-600');
            btn.classList.replace('hover:bg-blue-700', 'hover:bg-red-700');
            
            this.zigzagInterval = setInterval(() => {
                this.stepZigzag();
                if (this.zigzagIndex === 63) {
                    this.stopZigzag();
                }
            }, 250); // Speed: 4 steps per second
        }
    }
    
    stopZigzag() {
        this.zigzagPlaying = false;
        const btn = document.getElementById('zigzagPlayBtn');
        if (btn) {
            btn.innerText = '▶️ 播放掃描';
            btn.classList.replace('bg-red-600', 'bg-blue-600');
            btn.classList.replace('hover:bg-red-700', 'hover:bg-blue-700');
        }
        if (this.zigzagInterval) {
            clearInterval(this.zigzagInterval);
            this.zigzagInterval = null;
        }
    }
    
    stepZigzag() {
        this.zigzagIndex = (this.zigzagIndex + 1) % 64;
        this.highlightZigzagStep();
        this.drawZigzagCanvas();
    }

    drawZoomedBlock(canvasId, matrixData) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !matrixData) return;
        const ctx = canvas.getContext('2d');
        const cellSize = canvas.width / 8;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const val = matrixData[r][c];
                ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
                ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
    }
    
    reset() {
        this.stopZigzag();
        this.imageLoaded = false;
        this.hoveredBlock = { row: -1, col: -1 };
        this.selectedBlock = { row: 0, col: 0 };
        this.zigzagIndex = 0;
        this.zigzagData = [];
        
        // Clear canvases
        this.ctxOrig.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
        this.ctxOverlay.clearRect(0, 0, this.gridOverlayCanvas.width, this.gridOverlayCanvas.height);
        this.ctxZigzag.clearRect(0, 0, this.zigzagCanvas.width, this.zigzagCanvas.height);
        this.reconstructedImage.src = '';

        // Clear zoomed canvases
        const zoomOrig = document.getElementById('zoomOriginalCanvas');
        if (zoomOrig) zoomOrig.getContext('2d').clearRect(0, 0, zoomOrig.width, zoomOrig.height);
        const zoomRec = document.getElementById('zoomReconstructedCanvas');
        if (zoomRec) zoomRec.getContext('2d').clearRect(0, 0, zoomRec.width, zoomRec.height);
        
        // Clear matrix cells
        const containers = ['matrixOriginal', 'matrixShifted', 'matrixDct', 'matrixQuantTable', 'matrixQuantized', 'matrixReconstructed', 'zigzagArrayContainer'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        
        document.getElementById('hoverCoords').innerText = '滑鼠位置: -';
        document.getElementById('blockInfo').innerText = '選中區塊: 行 0, 列 0';
    }
}
