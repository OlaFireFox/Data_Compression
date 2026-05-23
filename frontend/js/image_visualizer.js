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
        this.reconstructedCanvas = document.getElementById('reconstructedCanvas');
        this.reconstructedOverlayCanvas = document.getElementById('reconstructedOverlayCanvas');
        
        this.ctxOrig = this.originalCanvas.getContext('2d');
        this.ctxRec = this.reconstructedCanvas.getContext('2d');
        this.ctxOverlay = this.reconstructedOverlayCanvas.getContext('2d');
        
        this.imageLoaded = false;
        this.imageWidth = 0;
        this.imageHeight = 0;
        
        // Grid selection states
        this.hoveredBlock = { row: -1, col: -1 };
        this.selectedBlock = { row: 0, col: 0 };
        this.blocksX = 0;
        this.blocksY = 0;
        this.showGridLines = false; // 是否顯示方塊分割線
        
        // Zoom and Drag states on the reconstructed canvas
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.dragStart = null;
        this.dragOffsetStart = { x: 0, y: 0 };
        this.mouseDownTime = 0;
        
        // Reconstructed image object
        this.recImageObj = null;
        
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
        // Panning and hover events on the reconstructed canvas
        this.reconstructedCanvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.isDragging = false;
                this.dragStart = { x: e.clientX, y: e.clientY };
                this.dragOffsetStart = { x: this.offsetX, y: this.offsetY };
                this.mouseDownTime = Date.now();
            }
        });
        
        this.reconstructedCanvas.addEventListener('mousemove', (e) => {
            if (this.dragStart) {
                const dx = e.clientX - this.dragStart.x;
                const dy = e.clientY - this.dragStart.y;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                    this.isDragging = true;
                    // Scale drag movement relative to CSS dimensions vs internal resolution
                    const rect = this.reconstructedCanvas.getBoundingClientRect();
                    const scaleX = this.reconstructedCanvas.width / rect.width;
                    const scaleY = this.reconstructedCanvas.height / rect.height;
                    
                    this.offsetX = this.dragOffsetStart.x + dx * scaleX;
                    this.offsetY = this.dragOffsetStart.y + dy * scaleY;
                    this.drawImages();
                }
            }
            
            if (!this.isDragging && this.imageLoaded) {
                const coords = this.getCoordsFromEvent(e);
                if (coords.row !== this.hoveredBlock.row || coords.col !== this.hoveredBlock.col) {
                    this.hoveredBlock = coords;
                    document.getElementById('hoverCoords').innerText = `滑鼠位置: 行 ${coords.row}, 列 ${coords.col}`;
                    this.drawGrid();
                }
            }
        });
        
        window.addEventListener('mouseup', (e) => {
            if (this.dragStart) {
                const duration = Date.now() - this.mouseDownTime;
                this.dragStart = null;
                if (!this.isDragging && duration < 250 && this.imageLoaded) {
                    // Click selection
                    const coords = this.getCoordsFromEvent(e);
                    this.selectedBlock = coords;
                    document.getElementById('blockInfo').innerText = `選中區塊: 行 ${coords.row}, 列 ${coords.col}`;
                    this.drawGrid();
                    
                    // Dispatch event
                    const event = new CustomEvent('blockSelected', { detail: coords });
                    window.dispatchEvent(event);
                }
                this.isDragging = false;
            }
        });
        
        this.reconstructedCanvas.addEventListener('mouseleave', () => {
            if (this.imageLoaded) {
                this.hoveredBlock = { row: -1, col: -1 };
                document.getElementById('hoverCoords').innerText = `滑鼠位置: -`;
                this.drawGrid();
            }
        });
        
        // Zoom via mouse wheel
        this.reconstructedCanvas.addEventListener('wheel', (e) => {
            if (!this.imageLoaded) return;
            e.preventDefault();
            
            const zoomIntensity = 0.1;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            const rect = this.reconstructedCanvas.getBoundingClientRect();
            const scaleX = this.reconstructedCanvas.width / rect.width;
            const scaleY = this.reconstructedCanvas.height / rect.height;
            
            const mX = (mouseX - rect.left) * scaleX;
            const mY = (mouseY - rect.top) * scaleY;
            
            const imageX = (mX - this.offsetX) / this.scale;
            const imageY = (mY - this.offsetY) / this.scale;
            
            const zoomFactor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);
            const newScale = Math.max(0.5, Math.min(20.0, this.scale * zoomFactor));
            
            this.offsetX = mX - imageX * newScale;
            this.offsetY = mY - imageY * newScale;
            this.scale = newScale;
            
            this.drawImages();
        }, { passive: false });
        
        // Grid toggle checkbox
        const showGridLinesCheckbox = document.getElementById('showGridLinesCheckbox');
        if (showGridLinesCheckbox) {
            this.showGridLines = showGridLinesCheckbox.checked;
            showGridLinesCheckbox.addEventListener('change', (e) => {
                this.showGridLines = e.target.checked;
                this.drawGrid();
            });
        }
        
        // Zoom buttons
        const imgZoomInBtn = document.getElementById('imgZoomInBtn');
        if (imgZoomInBtn) {
            imgZoomInBtn.addEventListener('click', () => this.zoomAroundCenter(1.2));
        }
        const imgZoomOutBtn = document.getElementById('imgZoomOutBtn');
        if (imgZoomOutBtn) {
            imgZoomOutBtn.addEventListener('click', () => this.zoomAroundCenter(1 / 1.2));
        }
        const imgZoomResetBtn = document.getElementById('imgZoomResetBtn');
        if (imgZoomResetBtn) {
            imgZoomResetBtn.addEventListener('click', () => this.resetView());
        }
        
        // Zig-zag controls
        document.getElementById('zigzagPlayBtn').addEventListener('click', () => this.toggleZigzagPlay());
        document.getElementById('zigzagStepBtn').addEventListener('click', () => this.stepZigzag());
    }
    
    zoomAroundCenter(factor) {
        if (!this.imageLoaded) return;
        const cx = this.reconstructedCanvas.width / 2;
        const cy = this.reconstructedCanvas.height / 2;
        const imageX = (cx - this.offsetX) / this.scale;
        const imageY = (cy - this.offsetY) / this.scale;
        
        this.scale = Math.max(0.5, Math.min(20.0, this.scale * factor));
        this.offsetX = cx - imageX * this.scale;
        this.offsetY = cy - imageY * this.scale;
        this.drawImages();
    }
    
    resetView() {
        if (!this.imageLoaded) return;
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.drawImages();
    }
    
    loadImage(src, callback) {
        const img = new Image();
        img.onload = () => {
            const w = img.width - (img.width % 8);
            const h = img.height - (img.height % 8);
            this.imageWidth = Math.max(8, w);
            this.imageHeight = Math.max(8, h);
            
            this.blocksX = this.imageWidth / 8;
            this.blocksY = this.imageHeight / 8;
            
            // Set canvas dimensions
            this.originalCanvas.width = this.imageWidth;
            this.originalCanvas.height = this.imageHeight;
            this.reconstructedCanvas.width = this.imageWidth;
            this.reconstructedCanvas.height = this.imageHeight;
            this.reconstructedOverlayCanvas.width = this.imageWidth;
            this.reconstructedOverlayCanvas.height = this.imageHeight;
            
            // Draw cropped original image
            this.ctxOrig.clearRect(0, 0, this.imageWidth, this.imageHeight);
            this.ctxOrig.drawImage(img, 0, 0, this.imageWidth, this.imageHeight);
            
            this.imageLoaded = true;
            
            // Default selected block to the center of the image detail region
            const centerCol = Math.floor(this.blocksX / 2);
            const centerRow = Math.floor(this.blocksY / 2);
            this.selectedBlock = { row: centerRow, col: centerCol };
            
            // Reset view transforms
            this.scale = 1.0;
            this.offsetX = 0;
            this.offsetY = 0;
            
            this.drawImages();
            
            if (callback) callback();
        };
        img.src = src;
    }
    
    loadReconstructedImage(base64, callback) {
        this.recImageObj = new Image();
        this.recImageObj.onload = () => {
            this.drawImages();
            if (callback) callback();
        };
        this.recImageObj.src = base64;
    }
    
    drawImages() {
        if (!this.imageLoaded) return;
        
        const ctx = this.ctxRec;
        const w = this.reconstructedCanvas.width;
        const h = this.reconstructedCanvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
        
        if (this.recImageObj && this.recImageObj.src) {
            ctx.drawImage(this.recImageObj, 0, 0, this.imageWidth, this.imageHeight);
        }
        ctx.restore();
        
        this.drawGrid();
    }
    
    drawGrid() {
        if (!this.imageLoaded) return;
        
        const ctx = this.ctxOverlay;
        const w = this.reconstructedOverlayCanvas.width;
        const h = this.reconstructedOverlayCanvas.height;
        
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(this.offsetX, this.offsetY);
        ctx.scale(this.scale, this.scale);
        
        // Draw grid lines
        if (this.showGridLines) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 0.5 / this.scale;
            
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
            ctx.lineWidth = 1.5 / this.scale;
            ctx.strokeRect(this.hoveredBlock.col * 8, this.hoveredBlock.row * 8, 8, 8);
        }
        
        // Draw selected block (Green outline + fill)
        if (this.selectedBlock.row >= 0 && this.selectedBlock.col >= 0) {
            ctx.strokeStyle = '#10b981'; // Emerald Green
            ctx.lineWidth = 2.0 / this.scale;
            ctx.strokeRect(this.selectedBlock.col * 8, this.selectedBlock.row * 8, 8, 8);
            
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(this.selectedBlock.col * 8, this.selectedBlock.row * 8, 8, 8);
        }
        
        ctx.restore();
    }
    
    getCoordsFromEvent(e) {
        const rect = this.reconstructedCanvas.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const clientY = e.clientY - rect.top;
        
        const scaleX = this.reconstructedCanvas.width / rect.width;
        const scaleY = this.reconstructedCanvas.height / rect.height;
        const canvasX = clientX * scaleX;
        const canvasY = clientY * scaleY;
        
        const imageX = (canvasX - this.offsetX) / this.scale;
        const imageY = (canvasY - this.offsetY) / this.scale;
        
        const col = Math.floor(imageX / 8);
        const row = Math.floor(imageY / 8);
        
        return {
            col: Math.max(0, Math.min(this.blocksX - 1, col)),
            row: Math.max(0, Math.min(this.blocksY - 1, row))
        };
    }
    
    getReconstructedPngDataUrl() {
        if (!this.imageLoaded || !this.recImageObj) return null;
        return this.recImageObj.src;
    }
    
    renderMatrix(containerId, data, type) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
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
                
                if (type === 'dct' || type === 'dequant') {
                    cell.innerText = Math.round(val);
                } else {
                    cell.innerText = val;
                }
                
                if (type === 'pixel') {
                    cell.style.backgroundColor = `rgb(${val}, ${val}, ${val})`;
                    cell.style.color = val > 128 ? '#0f172a' : '#f8fafc';
                    cell.style.border = '1px solid rgba(255, 255, 255, 0.15)';
                } else {
                    if (val === 0) {
                        cell.classList.add('matrix-cell-zero');
                    } else if (val > 0) {
                        cell.classList.add('matrix-cell-pos');
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
        document.getElementById('zigzagIndexText').innerText = this.zigzagIndex;
        document.getElementById('zigzagValueText').innerText = this.zigzagData[this.zigzagIndex] !== undefined ? this.zigzagData[this.zigzagIndex] : '-';
        
        document.querySelectorAll('.matrix-cell-highlight').forEach(el => el.classList.remove('matrix-cell-highlight'));
        document.querySelectorAll('[id^="zigzag-array-item-"]').forEach(el => {
            el.classList.remove('bg-emerald-500', 'text-slate-950', 'font-bold');
            el.classList.add('bg-slate-900', 'text-slate-400');
        });
        
        const [r, c] = ZIGZAG_ORDER[this.zigzagIndex];
        const cell = document.getElementById(`matrixQuantized-cell-${r}-${c}`);
        if (cell) {
            cell.classList.add('matrix-cell-highlight');
        }
        
        const arrayItem = document.getElementById('zigzag-array-item-' + this.zigzagIndex);
        if (arrayItem) {
            arrayItem.classList.remove('bg-slate-900', 'text-slate-400');
            arrayItem.classList.add('bg-emerald-500', 'text-slate-950', 'font-bold');
            arrayItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }
    
    drawZigzagCanvas() {
        const ctx = this.ctxZigzag;
        const w = this.zigzagCanvas.width;
        const h = this.zigzagCanvas.height;
        const cellSize = w / 8;
        
        ctx.clearRect(0, 0, w, h);
        
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
                ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
            }
        }
        
        for (let i = 0; i <= this.zigzagIndex; i++) {
            const [r, c] = ZIGZAG_ORDER[i];
            ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
            ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
        }
        
        ctx.beginPath();
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#10b981'; // Emerald Green
        for (let i = 0; i <= this.zigzagIndex; i++) {
            const [r, c] = ZIGZAG_ORDER[i];
            const px = c * cellSize + cellSize / 2;
            const py = r * cellSize + cellSize / 2;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        
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
            ctx.setLineDash([]);
        }
        
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
            }, 250);
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
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.recImageObj = null;
        
        this.ctxOrig.clearRect(0, 0, this.originalCanvas.width, this.originalCanvas.height);
        this.ctxRec.clearRect(0, 0, this.reconstructedCanvas.width, this.reconstructedCanvas.height);
        this.ctxOverlay.clearRect(0, 0, this.reconstructedOverlayCanvas.width, this.reconstructedOverlayCanvas.height);
        this.ctxZigzag.clearRect(0, 0, this.zigzagCanvas.width, this.zigzagCanvas.height);
        
        const zoomOrig = document.getElementById('zoomOriginalCanvas');
        if (zoomOrig) zoomOrig.getContext('2d').clearRect(0, 0, zoomOrig.width, zoomOrig.height);
        const zoomRec = document.getElementById('zoomReconstructedCanvas');
        if (zoomRec) zoomRec.getContext('2d').clearRect(0, 0, zoomRec.width, zoomRec.height);
        
        const containers = ['matrixOriginal', 'matrixShifted', 'matrixDct', 'matrixQuantTable', 'matrixQuantized', 'matrixReconstructed', 'zigzagArrayContainer'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
        });
        
        document.getElementById('hoverCoords').innerText = '滑鼠位置: -';
        document.getElementById('blockInfo').innerText = '選中區塊: 行 0, 列 0';
    }
}
