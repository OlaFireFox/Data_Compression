/**
 * 主應用邏輯
 */

// ============= 全局狀態 =============
const appState = {
    currentFile: null,
    compressionResult: null,
    frequencyChart: null,
    treeVisualizer: null,
    transmissionAnimator: null,  // ⭐ 傳輸動畫器
    animationPlaying: false,
    currentStepIndex: 0,
    originalText: null,  // ⭐ 保存原始文本用於傳輸動畫
    currentAnimationTimeline: null,  // ⭐ 當前 GSAP 時間線（用於速度調節）
    animationSpeed: 1,  // ⭐ 當前播放速度倍率
    lastCharPath: null  // ⭐ 上一個字符的路徑（用於路徑對比邏輯）
};

// 節流函數：限制某個函數在一定時間內只能執行一次，用於滑動拉桿時即時壓縮預覽
function throttle(func, limit) {
    let lastFunc;
    let lastRan;
    return function() {
        const context = this;
        const args = arguments;
        if (!lastRan) {
            func.apply(context, args);
            lastRan = Date.now();
        } else {
            clearTimeout(lastFunc);
            lastFunc = setTimeout(function() {
                if ((Date.now() - lastRan) >= limit) {
                    func.apply(context, args);
                    lastRan = Date.now();
                }
            }, limit - (Date.now() - lastRan));
        }
    }
}

// ============= DOM 元素 =============
const elements = {
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    filePreview: document.getElementById('filePreview'),
    fileName: document.getElementById('fileName'),
    fileSize: document.getElementById('fileSize'),
    clearFileBtn: document.getElementById('clearFileBtn'),
    compressBtn: document.getElementById('compressBtn'),
    progressContainer: document.getElementById('progressContainer'),
    progressBar: document.getElementById('progressBar'),
    progressPercent: document.getElementById('progressPercent'),
    compressionResult: document.getElementById('compressionResult'),
    resultOriginalSize: document.getElementById('resultOriginalSize'),
    resultCompressedSize: document.getElementById('resultCompressedSize'),
    resultCompressionRatio: document.getElementById('resultCompressionRatio'),
    frequencyChartCanvas: document.getElementById('frequencyChart'),
    codeTableContainer: document.getElementById('codeTableContainer'),
    copyCodeTableBtn: document.getElementById('copyCodeTableBtn'),
    downloadBinBtn: document.getElementById('downloadBinBtn'),
    viewAnimationBtn: document.getElementById('viewAnimationBtn'),
    statusText: document.getElementById('statusText'),
    connectionDot: document.getElementById('connectionDot'),
    connectionStatus: document.getElementById('connectionStatus'),
    buildStepsCount: document.getElementById('buildStepsCount'),
    uniqueCharsCount: document.getElementById('uniqueCharsCount'),
    animationModal: document.getElementById('animationModal'),
    closeAnimationBtn: document.getElementById('closeAnimationBtn'),
    currentStep: document.getElementById('currentStep'),
    totalSteps: document.getElementById('totalSteps'),
    leftNodeInfo: document.getElementById('leftNodeInfo'),
    rightNodeInfo: document.getElementById('rightNodeInfo'),
    prevStepBtn: document.getElementById('prevStepBtn'),
    playBtn: document.getElementById('playBtn'),
    fastCompleteBtn: document.getElementById('fastCompleteBtn'),
    nextStepBtn: document.getElementById('nextStepBtn'),
    animationSpeed: document.getElementById('animationSpeed'),
    speedValue: document.getElementById('speedValue'),
    stepsList: document.getElementById('stepsList'),
    apiStatus: document.getElementById('api-status'),
    notificationContainer: document.getElementById('notificationContainer'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    resetViewBtn: document.getElementById('resetViewBtn')
};

// ============= 計算函數 =============
/**
 * 計算空間節省率 (Space Saving Rate)
 * 公式: ((原始 bytes - 壓縮後 bytes) / 原始 bytes) * 100
 * 
 * @param {number} originalBytes - 原始文件大小（字節）
 * @param {number} compressedBytes - 壓縮後文件大小（字節）
 * @returns {string} 百分比字符串，例如 "98.66"
 */
function calculateSpaceSavingRate(originalBytes, compressedBytes) {
    // 防錯處理：如果原始大小為 0，返回 0%
    if (originalBytes <= 0) {
        console.warn('⚠️ 原始大小為 0 或負數，返回 0%');
        return '0.00';
    }
    
    // 計算節省率百分比
    const savingRatio = (originalBytes - compressedBytes) / originalBytes;
    const savingPercentage = savingRatio * 100;
    
    // ✅ 使用 toFixed(2) 保留兩位小數
    const formatted = savingPercentage.toFixed(2);
    
    console.log(`📊 空間節省率計算：`);
    console.log(`   原始: ${originalBytes} 字節`);
    console.log(`   壓縮後: ${compressedBytes} 字節`);
    console.log(`   節省率: ${formatted}%`);
    
    return formatted;
}

// ============= 主題切換 (Light / Dark Theme) =============
function initTheme() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    if (!themeToggleBtn) return;

    // 讀取先前儲存的主題偏好，若無則預設為深色模式 (dark)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.textContent = '🌙';
        themeToggleBtn.setAttribute('title', '切換為深色主題');
    } else {
        document.body.classList.remove('light-theme');
        themeToggleBtn.textContent = '☀️';
        themeToggleBtn.setAttribute('title', '切換為明亮主題');
    }

    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        if (isLight) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = '🌙';
            themeToggleBtn.setAttribute('title', '切換為深色主題');
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = '☀️';
            themeToggleBtn.setAttribute('title', '切換為明亮主題');
        }

        // 如果當前有加載的 LZ77 步驟，主動重繪畫布以套用新主題的顏色配色
        if (appState.lz77Visualizer && appState.lz77Visualizer.lastStep) {
            appState.lz77Visualizer.draw(appState.lz77Visualizer.lastStep);
        }
        // 同理重繪 Huffman Tree
        if (appState.treeVisualizer && appState.treeVisualizer.treeData) {
            appState.treeVisualizer.draw();
        }
    });
}

// ============= 初始化 =============
document.addEventListener('DOMContentLoaded', () => {
    console.log('應用初始化中...');
    
    initTheme();
    setupEventListeners();
    checkAPIStatus();
    setInterval(checkAPIStatus, 5000); // 每5秒檢查一次 API 狀態
});

// ============= 事件監聽 =============
function setupEventListeners() {
    // 拖放區域
    elements.dropZone.addEventListener('dragover', handleDragOver);
    elements.dropZone.addEventListener('dragleave', handleDragLeave);
    elements.dropZone.addEventListener('drop', handleFileDrop);
    elements.dropZone.addEventListener('click', () => elements.fileInput.click());

    // 文件輸入
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 清除文件
    elements.clearFileBtn.addEventListener('click', clearFile);

    // 壓縮按鈕
    elements.compressBtn.addEventListener('click', handleCompress);

    // 複製編碼表
    elements.copyCodeTableBtn.addEventListener('click', copyCodeTable);

    // 下載壓縮文件
    elements.downloadBinBtn.addEventListener('click', downloadBinFile);

    // 查看動畫
    elements.viewAnimationBtn.addEventListener('click', showAnimationModal);

    // 關閉動畫模態框
    elements.closeAnimationBtn.addEventListener('click', closeAnimationModal);

    // 動畫控制
    elements.prevStepBtn.addEventListener('click', () => previousStep());
    elements.playBtn.addEventListener('click', () => toggleAnimation());
    if (elements.fastCompleteBtn) {
        elements.fastCompleteBtn.addEventListener('click', () => runFastComplete());
    }
    elements.nextStepBtn.addEventListener('click', () => nextStep());

    // 縮放與重置視角按鈕監聽
    elements.zoomInBtn.addEventListener('click', () => {
        if (appState.treeVisualizer) {
            appState.treeVisualizer.zoom(1.2);
        }
    });
    elements.zoomOutBtn.addEventListener('click', () => {
        if (appState.treeVisualizer) {
            appState.treeVisualizer.zoom(1 / 1.2);
        }
    });
    elements.resetViewBtn.addEventListener('click', () => {
        if (appState.treeVisualizer) {
            appState.treeVisualizer.resetView();
        }
    });

    // ⭐ 播放速度即時調節
    elements.animationSpeed.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        elements.speedValue.textContent = speed + 'x';
        appState.animationSpeed = speed;
        
        // 如果動畫正在播放，即時調整 GSAP 時間線的速度
        if (appState.animationPlaying && appState.currentAnimationTimeline) {
            console.log(`⚡ 速度調整: ${speed}x`);
            // 使用 timeScale 即時調整動畫速度
            appState.currentAnimationTimeline.timeScale(speed);
        }
    });

    // 點擊模態框外部關閉
    elements.animationModal.addEventListener('click', (e) => {
        if (e.target === elements.animationModal) {
            closeAnimationModal();
        }
    });

    // ⭐ 監聽窗口尺寸變化，重新調整 Canvas 大小以保持清晰度
    window.addEventListener('resize', () => {
        if (appState.treeVisualizer && appState.treeVisualizer.canvas) {
            appState.treeVisualizer.setupCanvas();
            if (appState.treeVisualizer.treeData) {
                appState.treeVisualizer.drawTree();
            }
        }
    });

    // ============= Tab 切換事件 =============
    const tabHuffman = document.getElementById('tab-huffman');
    const tabImage = document.getElementById('tab-image');
    if (tabHuffman && tabImage) {
        tabHuffman.addEventListener('click', () => switchTab('huffman'));
        tabImage.addEventListener('click', () => switchTab('image'));
    }

    // ============= 圖片拖放與選擇事件 =============
    const imageDropZone = document.getElementById('imageDropZone');
    const imageFileInput = document.getElementById('imageFileInput');
    
    if (imageDropZone && imageFileInput) {
        imageDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageDropZone.classList.add('border-blue-500', 'bg-slate-800', 'shadow-lg', 'shadow-blue-500/10');
        });
        
        imageDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageDropZone.classList.remove('border-blue-500', 'bg-slate-800', 'shadow-lg', 'shadow-blue-500/10');
        });
        
        imageDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            imageDropZone.classList.remove('border-blue-500', 'bg-slate-800', 'shadow-lg', 'shadow-blue-500/10');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleImageFileSelect(files[0]);
            }
        });
        
        imageDropZone.addEventListener('click', () => imageFileInput.click());
        imageFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleImageFileSelect(e.target.files[0]);
            }
        });
    }

    // 清除圖片
    const clearImageBtn = document.getElementById('clearImageBtn');
    if (clearImageBtn) {
        clearImageBtn.addEventListener('click', clearImage);
    }

    // 壓縮品質拉桿（使用 throttle 實現拖曳時即時壓縮預覽）
    const imageQuality = document.getElementById('imageQuality');
    const qualityValText = document.getElementById('qualityValText');
    if (imageQuality && qualityValText) {
        // 每 120ms 限制最多發送一次 API 請求，達到平滑拖曳預覽效果
        const throttledCompress = throttle(() => {
            handleImageCompress();
        }, 120);

        imageQuality.addEventListener('input', (e) => {
            qualityValText.innerText = e.target.value;
            throttledCompress();
        });
        imageQuality.addEventListener('change', () => {
            handleImageCompress();
        });

        // 綁定加減按鈕
        const btnDecQuality = document.getElementById('btnDecQuality');
        const btnIncQuality = document.getElementById('btnIncQuality');
        if (btnDecQuality && btnIncQuality) {
            btnDecQuality.addEventListener('click', () => {
                let val = parseInt(imageQuality.value) - 1;
                if (val < 1) val = 1;
                imageQuality.value = val;
                qualityValText.innerText = val;
                handleImageCompress();
            });
            btnIncQuality.addEventListener('click', () => {
                let val = parseInt(imageQuality.value) + 1;
                if (val > 100) val = 100;
                imageQuality.value = val;
                qualityValText.innerText = val;
                handleImageCompress();
            });
        }
    }

    // 下載重建影像 (PNG)
    const downloadPngBtn = document.getElementById('downloadPngBtn');
    if (downloadPngBtn) {
        downloadPngBtn.addEventListener('click', () => {
            const src = appState.imageVisualizer ? appState.imageVisualizer.getReconstructedPngDataUrl() : null;
            if (!src || src.includes('placeholder')) {
                showNotification('請先上傳圖片再進行下載！', 'warning');
                return;
            }
            const quality = document.getElementById('imageQuality').value;
            const link = document.createElement('a');
            link.href = src;
            
            let originalName = 'reconstructed';
            if (appState.currentImageFile) {
                originalName = appState.currentImageFile.name.split('.').slice(0, -1).join('.');
            }
            link.download = `${originalName}_reconstructed_q${quality}.png`;
            link.click();
            showNotification('重建圖片下載開始 (PNG)', 'success');
        });
    }

    // 下載實際壓縮 JPEG
    const downloadJpgBtn = document.getElementById('downloadJpgBtn');
    if (downloadJpgBtn) {
        downloadJpgBtn.addEventListener('click', () => {
            if (!appState.compressedImageFilename) {
                showNotification('請先上傳圖片再進行下載！', 'warning');
                return;
            }
            const quality = document.getElementById('imageQuality').value;
            const mode = document.querySelector('input[name="imageMode"]:checked').value;
            
            const downloadUrl = API.getImageJpgDownloadUrl(
                appState.compressedImageFilename,
                quality,
                mode
            );
            window.open(downloadUrl, '_blank');
            showNotification('實際 JPEG 壓縮檔下載開始', 'success');
        });
    }

    // 色彩模式切換
    document.querySelectorAll('input[name="imageMode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            handleImageCompress();
        });
    });

    // 區塊選擇事件
    window.addEventListener('blockSelected', (e) => {
        const { row, col } = e.detail;
        document.getElementById('detailRow').innerText = row;
        document.getElementById('detailCol').innerText = col;
        fetchBlockDetails(row, col);
    });

    // 載入 LZ77 事件監聽
    setupLz77EventListeners();
}

// ============= 拖放處理 =============
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.add('border-blue-500', 'bg-slate-800', 'shadow-lg', 'shadow-blue-500/10');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove('border-blue-500', 'bg-slate-800', 'shadow-lg', 'shadow-blue-500/10');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    elements.dropZone.classList.remove('border-blue-500', 'bg-slate-800', 'shadow-lg', 'shadow-blue-500/10');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect({ target: { files } });
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 驗證檔案類型
    if (!file.name.endsWith('.txt')) {
        showNotification('只接受 .txt 檔案', 'error');
        return;
    }

    // 驗證檔案大小（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('檔案大小超過 10MB', 'error');
        return;
    }

    appState.currentFile = file;
    updateFilePreview();
    showNotification(`已選擇檔案：${file.name}`, 'success');
}

function updateFilePreview() {
    if (!appState.currentFile) return;

    elements.fileName.textContent = appState.currentFile.name;
    elements.fileSize.textContent = API.formatFileSize(appState.currentFile.size);
    elements.statusText.innerHTML = `📁 已選擇檔案: <span class="text-blue-400">${appState.currentFile.name}</span>`;
    elements.filePreview.classList.remove('hidden');
    elements.compressionResult.classList.add('hidden');
    elements.compressBtn.disabled = false;
}

function clearFile() {
    appState.currentFile = null;
    appState.compressionResult = null;
    elements.fileInput.value = '';
    elements.filePreview.classList.add('hidden');
    elements.compressionResult.classList.add('hidden');
    elements.statusText.innerHTML = '👁️ 等待檔案...';
    elements.buildStepsCount.textContent = '0';
    elements.uniqueCharsCount.textContent = '0';
}

// ============= 壓縮處理 =============
async function handleCompress() {
    if (!appState.currentFile) {
        showNotification('請先選擇檔案', 'error');
        return;
    }

    // 禁用按鈕
    elements.compressBtn.disabled = true;
    elements.progressContainer.classList.remove('hidden');
    elements.statusText.innerHTML = '⏳ 正在壓縮...';

    try {
        // ⭐ 讀取原始文本用於傳輸動畫
        const fileText = await appState.currentFile.text();
        appState.originalText = fileText;

        const response = await API.uploadAndCompress(appState.currentFile, (progress) => {
            elements.progressBar.style.width = progress + '%';
            elements.progressPercent.textContent = progress + '%';
        });

        if (response.success) {
            appState.compressionResult = response.data;
            displayCompressionResult(response.data);
            showNotification('壓縮成功！', 'success');
            elements.statusText.innerHTML = '✅ 壓縮完成';
        } else {
            showNotification(`壓縮失敗: ${response.error}`, 'error');
            elements.statusText.innerHTML = `❌ ${response.error}`;
        }
    } catch (error) {
        showNotification(`錯誤: ${error.message}`, 'error');
        elements.statusText.innerHTML = `❌ ${error.message}`;
        console.error('壓縮錯誤:', error);
    } finally {
        elements.compressBtn.disabled = false;
        elements.progressContainer.classList.add('hidden');
        elements.progressBar.style.width = '0%';
        elements.progressPercent.textContent = '0%';
    }
}

// ============= 顯示壓縮結果 =============
function displayCompressionResult(result) {
    // 顯示統計信息
    elements.resultOriginalSize.textContent = API.formatFileSize(result.original_size);
    
    // 如果有 compressed_size (實際的 gzip 大小)，就使用它，否則用 encoded_size (以位換算) 近似字節大小
    const compressedBytes = result.compressed_size !== undefined && result.compressed_size !== null
        ? result.compressed_size
        : Math.ceil(result.encoded_size / 8);
    
    elements.resultCompressedSize.textContent = API.formatFileSize(compressedBytes);
    
    // ✅ 計算空間節省率（單位統一為 bytes）
    // 公式：((原始 bytes - 壓縮後 bytes) / 原始 bytes) * 100
    const spaceSavingRate = calculateSpaceSavingRate(
        result.original_size,    // 原始 bytes
        compressedBytes          // 壓縮後 bytes
    );
    elements.resultCompressionRatio.textContent = spaceSavingRate;

    // 更新右側統計
    elements.buildStepsCount.textContent = result.build_steps.length;
    elements.uniqueCharsCount.textContent = Object.keys(result.frequencies).length;

    // 顯示結果區域
    elements.compressionResult.classList.remove('hidden');

    // 繪製字符頻率圖表
    displayFrequencyChart(result.frequencies);

    // 顯示編碼表
    displayCodeTable(result.code_table);

    // 初始化樹可視化器
    if (!appState.treeVisualizer) {
        appState.treeVisualizer = new HuffmanTreeVisualizer('treeCanvas');
    }
}

// ============= 字符頻率圖表 =============
function displayFrequencyChart(frequencies) {
    // 排序並取前 20 個字符
    const sortedChars = Object.entries(frequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

    const labels = sortedChars.map(([char]) => {
        if (char === ' ') return '⎵ (空格)';
        if (char === '\n') return '↵ (換行)';
        if (char === '\t') return '⇥ (製表)';
        return char;
    });

    const data = sortedChars.map(([_, freq]) => freq);

    // 銷毀舊圖表
    if (appState.frequencyChart) {
        appState.frequencyChart.destroy();
    }

    // 創建新圖表
    appState.frequencyChart = new Chart(elements.frequencyChartCanvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '出現次數',
                data,
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#cbd5e1'
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    }
                },
                y: {
                    ticks: {
                        color: '#cbd5e1'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ============= 編碼表顯示 =============
function displayCodeTable(codeTable) {
    const container = elements.codeTableContainer.querySelector('div');
    container.innerHTML = '';

    // 排序編碼表（按字符）
    const sortedCodes = Object.entries(codeTable).sort();

    sortedCodes.forEach(([char, code]) => {
        const displayChar = char === ' ' ? '⎵' : char === '\n' ? '↵' : char === '\t' ? '⇥' : char;
        
        const item = document.createElement('div');
        item.className = 'bg-slate-700 bg-opacity-30 rounded p-3 border border-slate-600 hover:border-blue-500 transition-colors';
        item.innerHTML = `
            <p class="text-xs text-slate-400 mb-1">
                <code class="font-bold text-blue-300">'${displayChar}'</code>
            </p>
            <p class="text-sm font-mono text-slate-200">${code}</p>
        `;
        container.appendChild(item);
    });
}

// ============= 複製編碼表 =============
async function copyCodeTable() {
    if (!appState.compressionResult) return;

    const codeTableJson = JSON.stringify(appState.compressionResult.code_table, null, 2);
    
    try {
        await navigator.clipboard.writeText(codeTableJson);
        showNotification('編碼表已複製到剪貼板', 'success');
    } catch (error) {
        showNotification('複製失敗', 'error');
    }
}

// ============= 下載壓縮檔案 =============
async function downloadBinFile() {
    if (!appState.compressionResult) {
        showNotification('沒有壓縮檔案', 'error');
        return;
    }

    try {
        showNotification('正在下載...', 'info');
        
        // ⭐ 粗高壓縮檔案 (.gz 格式 - 標準 GZIP)
        const filename = appState.compressionResult.compressed_filename || 
                        `${Date.now()}_compressed.gz`;
        
        const blob = await API.downloadCompressed(filename);
        
        // 創建下載連結
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('下載完成', 'success');
    } catch (error) {
        showNotification(`下載失敗: ${error.message}`, 'error');
    }
}

function showAnimationModal() {
    if (!appState.compressionResult) {
        showNotification('沒有壓縮數據', 'error');
        return;
    }

    console.log('🎬 打開動畫模態框');
    elements.animationModal.classList.remove('hidden');

    // ⭐ 延遲初始化，確保 DOM 已掛載並計算正確大小
    setTimeout(() => {
        try {
            console.log('初始化模態框組件...');
            
            // 初始化樹可視化器 (會自動調用 setupCanvas)
            if (!appState.treeVisualizer) {
                const treeCanvas = document.getElementById('treeCanvas');
                if (!treeCanvas) {
                    console.error('❌ Tree canvas element not found');
                    showNotification('樹可視化組件初始化失敗', 'error');
                    return;
                }
                console.log('✓ 創建樹可視化器');
                appState.treeVisualizer = new HuffmanTreeVisualizer('treeCanvas');
            } else {
                // 重新設置 canvas 大小，以適應新的容器尺寸
                console.log('✓ 重新設置 Canvas 大小');
                appState.treeVisualizer.setupCanvas();
            }

            appState.treeVisualizer.loadData(
                appState.compressionResult.tree_structure,
                appState.compressionResult.build_steps
            );
            console.log(`✓ 樹數據已載入 (${appState.compressionResult.build_steps.length} 步驟)`);

            // 更新步驟信息
            const textLength = appState.originalText.length;
            const maxSteps = Math.min(100, textLength);
            elements.totalSteps.textContent = maxSteps;
            updateAnimationUI();

            // 生成步驟列表
            generateStepsList();

            // 顯示第一步
            if (maxSteps > 0) {
                showStep(0);
            }

            console.log('✅ 動畫模態框初始化完成\n');

        } catch (error) {
            console.error('❌ 動畫模態框初始化失敗:', error);
            console.error(error.stack);
            showNotification('動畫初始化失敗：' + error.message, 'error');
        }
    }, 150); // 延遲 150ms 確保 DOM 完全掛載並計算了大小
}

function closeAnimationModal() {
    elements.animationModal.classList.add('hidden');
    stopAnimation();
}

// ============= 傳輸速度對比 UI 更新 =============
function updateSpeedComparisonUI() {
    if (!appState.compressionResult || !appState.originalText) return;
    
    const textLength = appState.originalText.length;
    const totalOriginalBits = textLength * 8;
    const totalHuffmanBits = appState.compressionResult.encoded_size;
    
    const originalBar = document.getElementById('originalProgressBar');
    const huffmanBar = document.getElementById('huffmanProgressBar');
    
    if (!originalBar || !huffmanBar) return;
    
    const originalProgressVal = parseFloat(originalBar.getAttribute('width')) || 0;
    const huffmanProgressVal = parseFloat(huffmanBar.getAttribute('width')) || 0;
    
    const barContainerWidth = 460;
    const ratioOrig = Math.min(1, originalProgressVal / barContainerWidth);
    const ratioHuff = Math.min(1, huffmanProgressVal / barContainerWidth);
    
    const idxOrig = Math.min(textLength - 1, Math.floor(ratioOrig * textLength));
    const idxHuff = Math.min(textLength - 1, Math.floor(ratioHuff * textLength));
    
    const charOrig = appState.originalText[idxOrig];
    const charHuff = appState.originalText[idxHuff];
    
    const bitsOrig = Math.min(totalOriginalBits, Math.floor(ratioOrig * totalOriginalBits));
    const bitsHuff = Math.min(totalHuffmanBits, Math.floor(ratioHuff * totalHuffmanBits));
    
    // 狀態文字
    let status = '傳輸中...';
    if (ratioOrig >= 1 && ratioHuff >= 1) {
        status = '傳輸完成';
    } else if (ratioHuff >= 1) {
        status = 'Huffman 完成 / 原始傳輸中';
    }
    
    const escapeChar = (c) => {
        if (c === ' ') return '⎵ (空格)';
        if (c === '\n') return '↵ (換行)';
        if (c === '\t') return '⇥ (製表)';
        return c;
    };
    
    const charOrigText = ratioOrig >= 1 ? '完成' : `第 ${idxOrig + 1} 字元 (${escapeChar(charOrig)})`;
    const charHuffText = ratioHuff >= 1 ? '完成' : `第 ${idxHuff + 1} 字元 (${escapeChar(charHuff)})`;
    
    const statusLine1 = document.getElementById('statusLine1');
    const statusLine2 = document.getElementById('statusLine2');
    const statusLine3 = document.getElementById('statusLine3');
    const statusLine4 = document.getElementById('statusLine4');
    const statusLine5 = document.getElementById('statusLine5');
    
    if (statusLine1) statusLine1.textContent = `狀態: ${status}`;
    if (statusLine2) statusLine2.textContent = `原始進度: ${charOrigText}`;
    if (statusLine3) statusLine3.textContent = `Huffman 進度: ${charHuffText}`;
    if (statusLine4) statusLine4.textContent = `傳輸位元: 原始: ${bitsOrig} / Huffman: ${bitsHuff} bits`;
    
    // 更新 SVG 進度條 % 數文字
    const originalText = document.getElementById('originalProgressText');
    const huffmanText = document.getElementById('huffmanProgressText');
    if (originalText) originalText.textContent = `${Math.round(ratioOrig * 100)}%`;
    if (huffmanText) huffmanText.textContent = `${Math.round(ratioHuff * 100)}%`;
    
    const baseDurationPerChar = 0.8;
    let originalDuration = textLength * baseDurationPerChar;
    originalDuration = Math.max(4, Math.min(originalDuration, 15));
    const durationHuffman = originalDuration * (totalHuffmanBits / totalOriginalBits);
    
    if (statusLine5) {
        statusLine5.textContent = `估計時長: 原始: ${originalDuration.toFixed(1)} 秒 / Huffman: ${durationHuffman.toFixed(1)} 秒`;
    }
}

// ============= 樹導覽自動播放邏輯 =============
function startTreeAutoplay() {
    if (appState.treeTimer) {
        clearTimeout(appState.treeTimer);
    }
    
    const textLength = appState.originalText.length;
    const maxSteps = Math.min(100, textLength);
    
    const runTreeStep = () => {
        if (!appState.animationPlaying) return;
        
        if (appState.currentStepIndex >= maxSteps - 1) {
            checkAnimationEnd();
            return;
        }
        
        appState.currentStepIndex++;
        showStep(appState.currentStepIndex);
        
        // 遞迴調用，使用當前速度倍率計算間隔時間
        appState.treeTimer = setTimeout(runTreeStep, 800 / appState.animationSpeed);
    };
    
    appState.treeTimer = setTimeout(runTreeStep, 800 / appState.animationSpeed);
}

// ============= 動畫結束檢查 =============
function checkAnimationEnd() {
    const textLength = appState.originalText.length;
    const maxSteps = Math.min(100, textLength);
    
    const timelineDone = !appState.currentAnimationTimeline || appState.currentAnimationTimeline.progress() >= 1;
    const treeDone = appState.currentStepIndex >= maxSteps - 1;
    
    if (timelineDone && treeDone) {
        console.log('🏁 動畫播放全部完成');
        appState.animationPlaying = false;
        elements.playBtn.textContent = '▶️ 播放';
        elements.playBtn.disabled = false;
        elements.prevStepBtn.disabled = false;
        elements.nextStepBtn.disabled = false;
        
        if (appState.treeTimer) {
            clearTimeout(appState.treeTimer);
            appState.treeTimer = null;
        }
    }
}

// ============= 一鍵跳過動畫 =============
function runFastComplete() {
    if (!appState.treeVisualizer || !appState.compressionResult) {
        showNotification('動畫數據未就緒', 'error');
        return;
    }

    console.log('⚡ 執行一鍵跳過動畫至 Huffman 完成點');
    
    const textLength = appState.originalText.length;
    const totalOriginalBits = textLength * 8;
    let totalHuffmanBits = appState.compressionResult.encoded_size;
    
    const originalBar = document.getElementById('originalProgressBar');
    const huffmanBar = document.getElementById('huffmanProgressBar');
    const originalText = document.getElementById('originalProgressText');
    const huffmanText = document.getElementById('huffmanProgressText');
    const barContainerWidth = 460;
    
    const baseDurationPerChar = 0.8;
    let originalDuration = textLength * baseDurationPerChar;
    originalDuration = Math.max(4, Math.min(originalDuration, 15));
    
    const durationOriginal = originalDuration;
    const durationHuffman = durationOriginal * (totalHuffmanBits / totalOriginalBits);

    // 如果尚未初始化時間線，先建立時間線
    if (!appState.currentAnimationTimeline) {
        if (originalBar && huffmanBar) {
            gsap.set(originalBar, { attr: { width: 0 } });
            gsap.set(huffmanBar, { attr: { width: 0 } });
            if (originalText) originalText.textContent = '0%';
            if (huffmanText) huffmanText.textContent = '0%';
        }
        
        const transmissionTimeline = gsap.timeline({
            onUpdate: () => {
                updateSpeedComparisonUI();
            },
            onComplete: () => {
                updateSpeedComparisonUI();
                checkAnimationEnd();
            }
        });
        
        appState.currentAnimationTimeline = transmissionTimeline;
        
        transmissionTimeline.to(originalBar, {
            attr: { width: barContainerWidth },
            duration: durationOriginal,
            ease: 'none'
        }, 0);
        
        transmissionTimeline.to(huffmanBar, {
            attr: { width: barContainerWidth },
            duration: durationHuffman,
            ease: 'none'
        }, 0);
    }
    
    // 暫停時間線與樹自動播放
    appState.animationPlaying = false;
    appState.currentAnimationTimeline.pause();
    
    if (appState.treeTimer) {
        clearTimeout(appState.treeTimer);
        appState.treeTimer = null;
    }
    
    // 快進至 Huffman 完成時刻
    appState.currentAnimationTimeline.seek(durationHuffman);
    
    // 更新速度對比 UI
    updateSpeedComparisonUI();
    
    // 繪製完整的樹，清除所有路徑高亮
    if (appState.treeVisualizer) {
        appState.treeVisualizer.clearAllHighlights();
        appState.treeVisualizer.drawTree();
    }
    
    // 更新播放按鈕與狀態
    elements.playBtn.textContent = '▶️ 繼續';
    elements.playBtn.disabled = false;
    elements.prevStepBtn.disabled = false;
    elements.nextStepBtn.disabled = false;
    
    showNotification('已跳過動畫至 Huffman 完成時刻', 'success');
}

// ============= 動畫控制 =============
function showStep(stepIndex) {
    if (!appState.treeVisualizer || !appState.originalText) return;

    const textLength = appState.originalText.length;
    const maxSteps = Math.min(100, textLength);

    if (stepIndex < 0 || stepIndex >= maxSteps) {
        return;
    }

    appState.currentStepIndex = stepIndex;

    const char = appState.originalText[stepIndex];
    const code = appState.compressionResult.code_table[char] || '-';
    const freq = appState.compressionResult.frequencies[char] || 0;

    // 更新步驟資訊與控制面板上的字元、編碼、頻率
    elements.currentStep.textContent = stepIndex + 1;
    
    const escapeChar = (c) => {
        if (c === ' ') return '⎵ (空格)';
        if (c === '\n') return '↵ (換行)';
        if (c === '\t') return '⇥ (製表)';
        return c;
    };
    
    elements.leftNodeInfo.textContent = `'${escapeChar(char)}' (${freq} 次)`;
    elements.rightNodeInfo.textContent = code;

    // 高亮樹路徑 (使用 smartPathAnimation)
    const currentPathObj = appState.treeVisualizer.findPathToCharacter(char);
    const currentPath = currentPathObj ? currentPathObj.path : [];
    appState.treeVisualizer.smartPathAnimation(char, appState.lastCharPath, appState.animationSpeed);
    appState.lastCharPath = currentPath;

    // 高亮對應的步驟列表項
    document.querySelectorAll('#stepsList .step-item').forEach((item, idx) => {
        if (idx === stepIndex) {
            item.classList.add('bg-blue-600', 'border-blue-400');
            item.classList.remove('bg-slate-700', 'border-slate-600');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('bg-blue-600', 'border-blue-400');
            item.classList.add('bg-slate-700', 'border-slate-600');
        }
    });

    updateAnimationUI();
}

function previousStep() {
    if (appState.currentStepIndex > 0) {
        showStep(appState.currentStepIndex - 1);
    }
}

function nextStep() {
    const textLength = appState.originalText.length;
    const maxSteps = Math.min(100, textLength);
    if (appState.currentStepIndex < maxSteps - 1) {
        showStep(appState.currentStepIndex + 1);
    }
}

async function toggleAnimation() {
    console.log('\n🎮 toggleAnimation 被觸發');
    console.log(`   當前狀態: ${appState.animationPlaying ? '播放中' : '已停止'}`);
    
    if (appState.animationPlaying) {
        console.log('⏸️ 暫停動畫');
        pauseAnimation();
    } else {
        console.log('▶️ 開始動畫');
        await playAnimation();
    }
}

async function playAnimation() {
    if (!appState.treeVisualizer || !appState.compressionResult) {
        console.error('❌ Animation prerequisites missing');
        showNotification('動畫數據未就緒', 'error');
        return;
    }

    appState.animationPlaying = true;
    appState.animationStopped = false;
    elements.playBtn.textContent = '⏸️ 暫停';
    elements.prevStepBtn.disabled = true;
    elements.nextStepBtn.disabled = true;
    elements.animationSpeed.disabled = false;
    appState.animationSpeed = parseFloat(elements.animationSpeed.value) || 1;

    const speed = appState.animationSpeed;
    const textLength = appState.originalText.length;
    const maxSteps = Math.min(100, textLength);

    // 支援從暫停狀態繼續播放
    if (appState.currentAnimationTimeline) {
        console.log('▶️ 繼續播放動畫');
        appState.currentAnimationTimeline.timeScale(speed);
        appState.currentAnimationTimeline.play();
        startTreeAutoplay();
        return;
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('▶️ 開始播放動畫 - 競速傳輸模式');
    console.log('═══════════════════════════════════════════════════');
    
    // 重置進度條與文字
    const originalBar = document.getElementById('originalProgressBar');
    const huffmanBar = document.getElementById('huffmanProgressBar');
    const originalText = document.getElementById('originalProgressText');
    const huffmanText = document.getElementById('huffmanProgressText');
    const barContainerWidth = 460;
    
    if (originalBar && huffmanBar) {
        gsap.set(originalBar, { attr: { width: 0 } });
        gsap.set(huffmanBar, { attr: { width: 0 } });
        if (originalText) originalText.textContent = '0%';
        if (huffmanText) huffmanText.textContent = '0%';
    }

    // 重置樹高亮與步驟索引
    appState.currentStepIndex = 0;
    appState.lastCharPath = null;
    showStep(0);

    // 計算傳輸速度比例
    const totalOriginalBits = textLength * 8;
    let totalHuffmanBits = appState.compressionResult.encoded_size;

    // 設定總時長
    const baseDurationPerChar = 0.8;
    let originalDuration = textLength * baseDurationPerChar;
    originalDuration = Math.max(4, Math.min(originalDuration, 15));

    const durationOriginal = originalDuration;
    const durationHuffman = durationOriginal * (totalHuffmanBits / totalOriginalBits);

    // 建立 GSAP 進度條競速動畫時間線
    const transmissionTimeline = gsap.timeline({
        onUpdate: () => {
            updateSpeedComparisonUI();
        },
        onComplete: () => {
            updateSpeedComparisonUI();
            checkAnimationEnd();
        }
    });

    appState.currentAnimationTimeline = transmissionTimeline;
    transmissionTimeline.timeScale(speed);

    // 原始進度動畫
    transmissionTimeline.to(originalBar, {
        attr: { width: barContainerWidth },
        duration: durationOriginal,
        ease: 'none'
    }, 0);

    // Huffman 進度動畫
    transmissionTimeline.to(huffmanBar, {
        attr: { width: barContainerWidth },
        duration: durationHuffman,
        ease: 'none'
    }, 0);

    // 啟動獨立的樹導覽自動播放
    startTreeAutoplay();
}

function pauseAnimation() {
    console.log('⏸️ 暫停動畫');
    appState.animationPlaying = false;
    elements.playBtn.textContent = '▶️ 繼續';
    elements.playBtn.disabled = false;

    // 暫停當前時間線
    if (appState.currentAnimationTimeline) {
        appState.currentAnimationTimeline.pause();
    }
    
    // 停止樹導覽計時器
    if (appState.treeTimer) {
        clearTimeout(appState.treeTimer);
        appState.treeTimer = null;
    }
}

function stopAnimation() {
    console.log('🛑 停止動畫');
    appState.animationPlaying = false;
    appState.animationStopped = true;
    elements.playBtn.textContent = '▶️ 播放';
    elements.playBtn.disabled = false;
    elements.prevStepBtn.disabled = false;
    elements.nextStepBtn.disabled = false;
    elements.animationSpeed.disabled = false;

    if (appState.currentAnimationTimeline) {
        appState.currentAnimationTimeline.kill();
        appState.currentAnimationTimeline = null;
    }
    
    // 停止樹導覽計時器
    if (appState.treeTimer) {
        clearTimeout(appState.treeTimer);
        appState.treeTimer = null;
    }
    
    // 重置進度條與文字
    const originalBar = document.getElementById('originalProgressBar');
    const huffmanBar = document.getElementById('huffmanProgressBar');
    const originalText = document.getElementById('originalProgressText');
    const huffmanText = document.getElementById('huffmanProgressText');
    if (originalBar && huffmanBar) {
        gsap.set(originalBar, { attr: { width: 0 } });
        gsap.set(huffmanBar, { attr: { width: 0 } });
        if (originalText) originalText.textContent = '0%';
        if (huffmanText) huffmanText.textContent = '0%';
    }
    
    // 重置樹高亮
    if (appState.treeVisualizer) {
        appState.treeVisualizer.clearAllHighlights();
        appState.treeVisualizer.drawTree();
    }
    
    appState.currentStepIndex = 0;
    appState.lastCharPath = null;
    showStep(0);
    
    // 重置狀態文字
    updateSpeedComparisonUI();
}

function updateAnimationUI() {
    const textLength = appState.originalText ? appState.originalText.length : 0;
    const maxSteps = Math.min(100, textLength);
    elements.prevStepBtn.disabled = appState.currentStepIndex === 0;
    elements.nextStepBtn.disabled = appState.currentStepIndex === maxSteps - 1;
}

function generateStepsList() {
    const stepsList = elements.stepsList;
    stepsList.innerHTML = '';
    
    if (!appState.originalText) return;
    
    const textLength = appState.originalText.length;
    const maxSteps = Math.min(100, textLength);
    
    for (let idx = 0; idx < maxSteps; idx++) {
        const char = appState.originalText[idx];
        const code = appState.compressionResult.code_table[char] || '-';
        const freq = appState.compressionResult.frequencies[char] || 0;
        
        const item = document.createElement('div');
        item.className = 'step-item bg-slate-700 border border-slate-600 rounded p-3 cursor-pointer transition-all hover:border-blue-500 text-xs font-mono';
        
        const escapeChar = (c) => {
            if (c === ' ') return '⎵ (空格)';
            if (c === '\n') return '↵ (換行)';
            if (c === '\t') return '⇥ (製表)';
            return c;
        };
        
        item.innerHTML = `
            <div class="text-slate-300">第 ${idx + 1} 字元</div>
            <div class="text-blue-400 font-bold">'${escapeChar(char)}' &rarr; ${code} (頻率: ${freq})</div>
        `;
        
        item.addEventListener('click', () => {
            if (appState.animationPlaying) {
                pauseAnimation();
            }
            showStep(idx);
        });
        stepsList.appendChild(item);
    }
}

// ============= API 狀態檢查 =============
async function checkAPIStatus() {
    const isConnected = await API.checkAPIConnection();
    
    if (isConnected) {
        elements.connectionDot.classList.remove('bg-red-500', 'animate-pulse');
        elements.connectionDot.classList.add('bg-green-500');
        elements.connectionStatus.textContent = '已連線 ✓';
        elements.apiStatus.textContent = '在線';
        elements.apiStatus.classList.remove('text-red-400');
        elements.apiStatus.classList.add('text-green-400');
    } else {
        elements.connectionDot.classList.add('bg-red-500', 'animate-pulse');
        elements.connectionDot.classList.remove('bg-green-500');
        elements.connectionStatus.textContent = '已斷線 ✗';
        elements.apiStatus.textContent = '離線';
        elements.apiStatus.classList.add('text-red-400');
        elements.apiStatus.classList.remove('text-green-400');
    }
}

// ============= 通知系統 =============
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `pointer-events-auto px-4 py-3 rounded-lg font-medium text-sm backdrop-blur-md border animate-in fade-in slide-in-from-right-4 duration-300`;

    const typeClasses = {
        'success': 'bg-green-900 bg-opacity-50 border-green-700 text-green-200',
        'error': 'bg-red-900 bg-opacity-50 border-red-700 text-red-200',
        'info': 'bg-blue-900 bg-opacity-50 border-blue-700 text-blue-200',
        'warning': 'bg-yellow-900 bg-opacity-50 border-yellow-700 text-yellow-200'
    };

    notification.className += ' ' + (typeClasses[type] || typeClasses['info']);
    notification.textContent = message;

    elements.notificationContainer.appendChild(notification);

    // 自動移除
    setTimeout(() => {
        notification.classList.add('animate-out', 'fade-out', 'slide-out-to-right-4');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============= Tab 切換 =============
function switchTab(activeTab) {
    const tabHuffman = document.getElementById('tab-huffman');
    const tabImage = document.getElementById('tab-image');
    const tabLz77 = document.getElementById('tab-lz77');
    const huffmanSection = document.getElementById('huffman-section');
    const imageSection = document.getElementById('image-section');
    const lz77Section = document.getElementById('lz77-section');
    
    // Reset all tabs classes
    const inactiveClass = "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 text-slate-400 hover:text-slate-200";
    const activeClass = "px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-300 bg-blue-600 text-white shadow-md";
    
    if (tabHuffman) tabHuffman.className = inactiveClass;
    if (tabImage) tabImage.className = inactiveClass;
    if (tabLz77) tabLz77.className = inactiveClass;
    
    if (huffmanSection) huffmanSection.classList.add('hidden');
    if (imageSection) imageSection.classList.add('hidden');
    if (lz77Section) lz77Section.classList.add('hidden');
    
    if (activeTab === 'huffman') {
        if (tabHuffman) tabHuffman.className = activeClass;
        if (huffmanSection) huffmanSection.classList.remove('hidden');
    } else if (activeTab === 'image') {
        if (tabImage) tabImage.className = activeClass;
        if (imageSection) imageSection.classList.remove('hidden');
        if (!appState.imageVisualizer) {
            appState.imageVisualizer = new ImageVisualizer();
        }
    } else if (activeTab === 'lz77') {
        if (tabLz77) tabLz77.className = activeClass;
        if (lz77Section) lz77Section.classList.remove('hidden');
        if (!appState.lz77Visualizer) {
            appState.lz77Visualizer = new LZ77Visualizer('lz77WindowCanvas');
        }
    }
}

// ============= 圖片處理 =============
function handleImageFileSelect(file) {
    if (!file) return;
    
    // Verify file type
    if (!file.type.startsWith('image/')) {
        showNotification('只接受圖片檔案 (JPG, PNG, BMP, WEBP)', 'error');
        return;
    }
    
    // Check file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
        showNotification('圖片檔案大小超過 10MB', 'error');
        return;
    }
    
    // Clear previous states
    if (appState.imageVisualizer) {
        appState.imageVisualizer.reset();
    } else {
        appState.imageVisualizer = new ImageVisualizer();
    }
    
    appState.currentImageFile = file;
    appState.compressedImageFilename = null;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        appState.imageVisualizer.loadImage(e.target.result, () => {
            document.getElementById('imageWorkspace').classList.remove('hidden');
            showNotification(`已選擇圖片：${file.name}`, 'success');
            // Trigger initial compression
            handleImageCompress();
        });
    };
    reader.readAsDataURL(file);
}

async function handleImageCompress() {
    if (!appState.currentImageFile) return;
    
    const spinner = document.getElementById('compressingSpinner');
    if (spinner) spinner.classList.remove('hidden');
    
    try {
        const quality = document.getElementById('imageQuality').value;
        const mode = document.querySelector('input[name="imageMode"]:checked').value;
        
        const response = await API.compressImage(appState.currentImageFile, quality, mode);
        
        if (response.success) {
            appState.compressedImageFilename = response.data.filename;
            
            // Reconstructed image display
            if (appState.imageVisualizer) {
                appState.imageVisualizer.loadReconstructedImage(response.data.reconstructed_image);
            }
            
            // Statistics indicators
            const stats = response.data.stats;
            document.getElementById('imgOriginalSize').innerText = API.formatFileSize(stats.original_size);
            document.getElementById('imgCompressedSize').innerText = API.formatFileSize(stats.compressed_size);
            document.getElementById('imgRatio').innerText = stats.compression_ratio;
            
            const savings = (100 - (stats.compressed_size / stats.original_size * 100)).toFixed(1);
            document.getElementById('imgSavingsPercent').innerText = `${savings}%`;
            document.getElementById('imgZeroPercent').innerText = stats.zero_percentage;
            document.getElementById('imgPsnr').innerText = stats.psnr;
            document.getElementById('imgResolution').innerText = `${stats.processed_width} x ${stats.processed_height}`;
            document.getElementById('imgBlockCount').innerText = stats.blocks_count;
            
            // Fetch detail for selected block coordinates (defaulting to the previously selected or 0,0)
            const selRow = appState.imageVisualizer.selectedBlock.row;
            const selCol = appState.imageVisualizer.selectedBlock.col;
            document.getElementById('detailRow').innerText = selRow;
            document.getElementById('detailCol').innerText = selCol;
            
            fetchBlockDetails(selRow, selCol);
            showNotification('圖片壓縮完成！', 'success');
        } else {
            showNotification(`壓縮失敗: ${response.error}`, 'error');
        }
    } catch (e) {
        showNotification(`發生錯誤: ${e.message}`, 'error');
        console.error('Image compression error:', e);
    } finally {
        if (spinner) spinner.classList.add('hidden');
    }
}

async function fetchBlockDetails(row, col) {
    if (!appState.compressedImageFilename) return;
    
    try {
        const quality = document.getElementById('imageQuality').value;
        const mode = document.querySelector('input[name="imageMode"]:checked').value;
        
        const response = await API.getBlockDetail(
            appState.compressedImageFilename,
            quality,
            mode,
            row,
            col
        );
        
        if (response.success && appState.imageVisualizer) {
            const matrices = response.data;
            
            // Render matrices Y channels
            appState.imageVisualizer.renderMatrix('matrixOriginal', matrices.original_block, 'pixel');
            appState.imageVisualizer.renderMatrix('matrixShifted', matrices.original_block.map(r => r.map(v => v - 128)), 'other');
            appState.imageVisualizer.renderMatrix('matrixDct', matrices.dct_block, 'dct');
            appState.imageVisualizer.renderMatrix('matrixQuantTable', matrices.quantization_table, 'other');
            appState.imageVisualizer.renderMatrix('matrixQuantized', matrices.quantized_block, 'quantized');
            appState.imageVisualizer.renderMatrix('matrixReconstructed', matrices.reconstructed_block, 'pixel');
            
            // Render zoomed original and reconstructed Y-channel block canvases (20x zoom)
            appState.imageVisualizer.drawZoomedBlock('zoomOriginalCanvas', matrices.original_block);
            appState.imageVisualizer.drawZoomedBlock('zoomReconstructedCanvas', matrices.reconstructed_block);

            // Set Zig-zag scanning sequence
            appState.imageVisualizer.setZigzagData(matrices.zigzag_sequence);
            
            document.getElementById('blockDetailPanel').classList.remove('hidden');
        } else if (response.error) {
            console.error('Error fetching block details:', response.error);
        }
    } catch (e) {
        console.error('Fetch block detail error:', e);
    }
}

function clearImage() {
    appState.currentImageFile = null;
    appState.compressedImageFilename = null;
    
    document.getElementById('imageFileInput').value = '';
    document.getElementById('imageWorkspace').classList.add('hidden');
    document.getElementById('blockDetailPanel').classList.add('hidden');
    
    if (appState.imageVisualizer) {
        appState.imageVisualizer.reset();
    }
    showNotification('圖片已清除', 'info');
}

console.log('應用已載入 (v1.1.0 支援 JPEG/DCT 可視化)');


// ============= LZ77 & LZH 邏輯實現 =============

function setupLz77EventListeners() {
    const tabLz77 = document.getElementById('tab-lz77');
    if (tabLz77) {
        tabLz77.addEventListener('click', () => switchTab('lz77'));
    }

    const lz77DropZone = document.getElementById('lz77DropZone');
    const lz77FileInput = document.getElementById('lz77FileInput');
    
    if (lz77DropZone && lz77FileInput) {
        lz77DropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            lz77DropZone.classList.add('border-teal-500', 'bg-slate-800', 'shadow-lg', 'shadow-teal-500/10');
        });
        
        lz77DropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            lz77DropZone.classList.remove('border-teal-500', 'bg-slate-800', 'shadow-lg', 'shadow-teal-500/10');
        });
        
        lz77DropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            lz77DropZone.classList.remove('border-teal-500', 'bg-slate-800', 'shadow-lg', 'shadow-teal-500/10');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleLz77FileSelect(files[0]);
            }
        });
        
        lz77DropZone.addEventListener('click', () => lz77FileInput.click());
        lz77FileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleLz77FileSelect(e.target.files[0]);
            }
        });
    }

    // 範本按鈕
    const btnLoadLogTemplate = document.getElementById('btnLoadLogTemplate');
    const btnLoadJsonTemplate = document.getElementById('btnLoadJsonTemplate');
    if (btnLoadLogTemplate) {
        btnLoadLogTemplate.addEventListener('click', () => loadLz77Template('log'));
    }
    if (btnLoadJsonTemplate) {
        btnLoadJsonTemplate.addEventListener('click', () => loadLz77Template('json'));
    }

    // 清除按鈕
    const clearLz77Btn = document.getElementById('clearLz77Btn');
    if (clearLz77Btn) {
        clearLz77Btn.addEventListener('click', clearLz77Workspace);
    }

    // 壓縮按鈕
    const lz77CompressBtn = document.getElementById('lz77CompressBtn');
    if (lz77CompressBtn) {
        lz77CompressBtn.addEventListener('click', handleLz77Compress);
    }

    // 滑桿連動文字
    const rngLz77WindowSize = document.getElementById('rngLz77WindowSize');
    const txtLz77WindowSize = document.getElementById('txtLz77WindowSize');
    const rngLz77LookaheadSize = document.getElementById('rngLz77LookaheadSize');
    const txtLz77LookaheadSize = document.getElementById('txtLz77LookaheadSize');
    const lz77ParamWarning = document.getElementById('lz77ParamWarning');
    const lz77ResultContainer = document.getElementById('lz77ResultContainer');

    function checkParamChange() {
        if (lz77ParamWarning && lz77ResultContainer && !lz77ResultContainer.classList.contains('hidden')) {
            lz77ParamWarning.classList.remove('hidden');
        }
    }

    if (rngLz77WindowSize && txtLz77WindowSize) {
        rngLz77WindowSize.addEventListener('input', (e) => {
            txtLz77WindowSize.textContent = `${e.target.value} B`;
            checkParamChange();
        });
    }
    if (rngLz77LookaheadSize && txtLz77LookaheadSize) {
        rngLz77LookaheadSize.addEventListener('input', (e) => {
            txtLz77LookaheadSize.textContent = `${e.target.value} B`;
            checkParamChange();
        });
    }

    // 動畫速度滑桿
    const lz77AnimationSpeed = document.getElementById('lz77AnimationSpeed');
    const lz77SpeedValue = document.getElementById('lz77SpeedValue');
    if (lz77AnimationSpeed && lz77SpeedValue) {
        lz77AnimationSpeed.addEventListener('input', (e) => {
            lz77SpeedValue.textContent = `${e.target.value}x`;
        });
    }

    // 下載按鈕
    const downloadLz77Btn = document.getElementById('downloadLz77Btn');
    const downloadLzhBtn = document.getElementById('downloadLzhBtn');
    if (downloadLz77Btn) {
        downloadLz77Btn.addEventListener('click', downloadLz77File);
    }
    if (downloadLzhBtn) {
        downloadLzhBtn.addEventListener('click', downloadLzhFile);
    }

    // 動畫控制
    const lz77PlayBtn = document.getElementById('lz77PlayBtn');
    const lz77StepBtn = document.getElementById('lz77StepBtn');
    const lz77ResetBtn = document.getElementById('lz77ResetBtn');
    if (lz77PlayBtn) {
        lz77PlayBtn.addEventListener('click', toggleLz77Play);
    }
    if (lz77StepBtn) {
        lz77StepBtn.addEventListener('click', lz77StepNext);
    }
    if (lz77ResetBtn) {
        lz77ResetBtn.addEventListener('click', resetLz77Animation);
    }
}

function handleLz77FileSelect(file) {
    if (!file) return;
    
    appState.lz77File = file;
    document.getElementById('lz77FileName').textContent = file.name;
    document.getElementById('lz77FileSize').textContent = API.formatFileSize(file.size);
    
    const reader = new FileReader();
    reader.onload = (e) => {
        appState.lz77OriginalText = e.target.result;
        document.getElementById('lz77Workspace').classList.remove('hidden');
        document.getElementById('lz77DropZone').classList.add('hidden');
        document.getElementById('lz77ResultContainer').classList.add('hidden');
        resetLz77Animation();
        showNotification(`已載入檔案: ${file.name}`, 'success');
    };
    reader.readAsText(file);
}

function loadLz77Template(type) {
    let content = "";
    let filename = "";
    
    if (type === 'log') {
        filename = "server_system_logs.log";
        content = Array(15).fill(0).map((_, idx) => {
            const time = `14:30:${idx.toString().padStart(2, '0')}`;
            return `[2026-06-06 ${time}] INFO: Userallen connected to server. API Request: GET /api/lz77/status from IP: 192.168.1.105 (Status: 200 OK)\n`;
        }).join("");
    } else {
        filename = "repetitive_records.json";
        const baseObj = {
            status: "active",
            role: "editor",
            project: "Data Compression Visualizer",
            verified: true,
            tags: ["LZ77", "Huffman", "LZH", "DEFLATE"]
        };
        const records = Array(10).fill(0).map((_, idx) => ({
            id: 1000 + idx,
            name: `User_${String.fromCharCode(65 + (idx % 3))}`,
            ...baseObj
        }));
        content = JSON.stringify(records, null, 2);
    }
    
    const file = new File([content], filename, { type: 'text/plain' });
    handleLz77FileSelect(file);
}

function clearLz77Workspace() {
    appState.lz77File = null;
    appState.lz77OriginalText = "";
    appState.lz77Result = null;
    
    document.getElementById('lz77FileInput').value = '';
    document.getElementById('lz77Workspace').classList.add('hidden');
    document.getElementById('lz77DropZone').classList.remove('hidden');
    
    const lz77ParamWarning = document.getElementById('lz77ParamWarning');
    if (lz77ParamWarning) {
        lz77ParamWarning.classList.add('hidden');
    }
    
    resetLz77Animation();
    showNotification('LZ77 工作區已重設', 'info');
}

async function handleLz77Compress() {
    if (!appState.lz77File || !appState.lz77OriginalText) {
        showNotification('請先上傳檔案', 'warning');
        return;
    }
    
    const lz77ParamWarning = document.getElementById('lz77ParamWarning');
    if (lz77ParamWarning) {
        lz77ParamWarning.classList.add('hidden');
    }
    
    const compressBtn = document.getElementById('lz77CompressBtn');
    const progressContainer = document.getElementById('lz77ProgressContainer');
    const progressBar = document.getElementById('lz77ProgressBar');
    const progressPercent = document.getElementById('lz77ProgressPercent');
    const progressStatus = document.getElementById('lz77ProgressStatus');

    compressBtn.disabled = true;
    compressBtn.textContent = '📦 正在進行 LZ77 與 LZH 混合壓縮...';
    
    if (progressContainer) {
        progressContainer.classList.remove('hidden');
        progressBar.style.width = '0%';
        progressPercent.textContent = '0%';
        progressStatus.textContent = '正在準備上傳...';
    }
    
    try {
        const windowSize = document.getElementById('rngLz77WindowSize').value;
        const lookaheadSize = document.getElementById('rngLz77LookaheadSize').value;
        
        // 呼叫 LZH API 獲取全部資訊 (附帶進度 callback)
        const response = await API.compressLZH(appState.lz77File, windowSize, lookaheadSize, (progress) => {
            if (progressBar && progressPercent && progressStatus) {
                progressBar.style.width = progress + '%';
                progressPercent.textContent = progress + '%';
                if (progress >= 100) {
                    progressStatus.textContent = '正在進行 LZH 聯動壓縮，請稍候...';
                } else {
                    progressStatus.textContent = `正在上傳檔案...`;
                }
            }
        });
        
        if (response.success) {
            if (progressBar && progressPercent && progressStatus) {
                progressBar.style.width = '100%';
                progressPercent.textContent = '100%';
                progressStatus.textContent = '✅ 壓縮完成！';
            }
            
            appState.lz77Result = response.data;
            appState.lz77Steps = response.data.steps;
            
            // 載入 Visualizer 文字
            if (appState.lz77Visualizer) {
                appState.lz77Visualizer.setText(appState.lz77OriginalText);
            }
            
            // 顯示結果
            document.getElementById('lz77ResultContainer').classList.remove('hidden');
            
            // 填寫統計指標
            const stats = response.data.stats;
            document.getElementById('lz77OrigSizeText').textContent = API.formatFileSize(stats.original_size);
            document.getElementById('lz77OnlySizeText').textContent = API.formatFileSize(stats.lz77_size);
            document.getElementById('lzhSizeText').textContent = API.formatFileSize(stats.lzh_size);
            document.getElementById('lzhSavingsText').textContent = `${stats.space_saving}%`;
            
            // 畫效能圖表
            drawLz77CompareChart(stats);
            
            // 渲染 Token 日誌與霍夫曼碼表
            renderLz77TokenLog(appState.lz77Steps);
            renderLzhCodeTable(response.data.code_table);
            
            // 初始化動畫狀態
            resetLz77Animation();
            
            showNotification('LZ77 & LZH 混合壓縮成功！', 'success');
            
            // 延遲隱藏進度條
            setTimeout(() => {
                if (progressContainer) progressContainer.classList.add('hidden');
            }, 1000);
        } else {
            showNotification(`壓縮失敗: ${response.error}`, 'error');
            if (progressContainer) progressContainer.classList.add('hidden');
        }
    } catch (e) {
        showNotification(`發生錯誤: ${e.message}`, 'error');
        console.error(e);
        if (progressContainer) progressContainer.classList.add('hidden');
    } finally {
        compressBtn.disabled = false;
        compressBtn.textContent = '🚀 開始 LZ77 與 LZH 混合壓縮';
    }
}

function drawLz77CompareChart(stats) {
    const ctx = document.getElementById('lz77CompareChart').getContext('2d');
    
    if (appState.lz77CompareChart) {
        appState.lz77CompareChart.destroy();
    }
    
    appState.lz77CompareChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['原始大小', 'LZ77 字典壓縮', 'LZH 聯動壓縮 (Deflate)'],
            datasets: [{
                label: '檔案大小 (Bytes)',
                data: [stats.original_size, stats.lz77_size, stats.lzh_size],
                backgroundColor: [
                    'rgba(71, 85, 105, 0.6)', // slate-600
                    'rgba(13, 148, 136, 0.6)', // teal-600
                    'rgba(16, 185, 129, 0.6)'  // emerald-500
                ],
                borderColor: [
                    'rgb(71, 85, 105)',
                    'rgb(13, 148, 136)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // 橫向條形圖
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { color: '#334155' },
                    ticks: { color: '#cbd5e1' }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#cbd5e1' }
                }
            }
        }
    });
}

function renderLz77TokenLog(steps) {
    const container = document.getElementById('lz77TokenLog');
    container.innerHTML = "";
    
    steps.forEach((step, idx) => {
        const tok = step.token;
        const div = document.createElement('div');
        div.className = 'py-1 border-b border-slate-900 flex justify-between items-center hover:bg-slate-900/50 px-1.5 cursor-pointer';
        div.id = `lz77-tok-item-${idx}`;
        
        let charDisp = tok.next_char;
        if (charDisp === ' ') charDisp = '⎵ (空格)';
        else if (charDisp === '\n') charDisp = '↵ (換行)';
        else if (charDisp === '\t') charDisp = '⇥ (製表)';
        else if (charDisp === '') charDisp = 'EOF';
        
        div.innerHTML = `
            <span class="text-teal-400 font-bold">Step ${idx+1}:</span>
            <span class="text-slate-300">Offset: ${tok.offset}, Len: ${tok.length}</span>
            <span class="text-emerald-400 font-semibold">'${charDisp}'</span>
        `;
        
        div.addEventListener('click', () => {
            pauseLz77Animation();
            showLz77Step(idx);
        });
        
        container.appendChild(div);
    });
}

function renderLzhCodeTable(codeTable) {
    const grid = document.getElementById('lzhCodeTableGrid');
    grid.innerHTML = "";
    
    // 按二進位編碼長度排序顯示
    const sorted = Object.entries(codeTable).sort((a, b) => a[1].length - b[1].length);
    
    sorted.forEach(([hexVal, code]) => {
        const item = document.createElement('div');
        item.className = 'flex justify-between items-center p-1.5 bg-slate-900/60 rounded border border-slate-800 text-[10px]';
        
        // 解析 hex 字節，顯示對應字元 (如果是 ASCII 可讀)
        const intVal = parseInt(hexVal, 16);
        let charDisp = hexVal;
        if (32 <= intVal && intVal <= 126) {
            charDisp = `'${String.fromCharCode(intVal)}' (${hexVal})`;
        }
        
        item.innerHTML = `
            <span class="text-slate-400">${charDisp}</span>
            <span class="text-green-400 font-bold font-mono">${code}</span>
        `;
        grid.appendChild(item);
    });
}

async function downloadLz77File() {
    if (!appState.lz77Result || !appState.lz77Result.filename) return;
    const lz77Filename = appState.lz77Result.filename.replace('.lzh', '.lz77');
    try {
        const blob = await API.downloadLz77File(lz77Filename);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = lz77Filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('下載 LZ77 壓縮檔案成功', 'success');
    } catch (e) {
        showNotification(`下載失敗: ${e.message}`, 'error');
    }
}

async function downloadLzhFile() {
    if (!appState.lz77Result || !appState.lz77Result.filename) return;
    // 將 .lz77 副檔名換成 .lzh
    const lzhFilename = appState.lz77Result.filename.replace('.lz77', '.lzh');
    try {
        const blob = await API.downloadLzhFile(lzhFilename);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = lzhFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification('下載 LZH 聯動壓縮檔案成功', 'success');
    } catch (e) {
        showNotification(`下載失敗: ${e.message}`, 'error');
    }
}

// ============= LZ77 動畫控制邏輯 =============

function showLz77Step(idx) {
    if (typeof idx !== 'number' || Number.isNaN(idx)) {
        console.error("[main.js] showLz77Step called with invalid index:", idx);
        return;
    }
    if (!appState.lz77Steps || idx < 0 || idx >= appState.lz77Steps.length) {
        console.warn(`[main.js] showLz77Step index out of range: ${idx}, steps length: ${appState.lz77Steps ? appState.lz77Steps.length : 'none'}`);
        return;
    }
    
    appState.lz77CurrentStep = idx;
    const step = appState.lz77Steps[idx];
    
    // 呼叫畫布視覺化繪製
    if (appState.lz77Visualizer) {
        appState.lz77Visualizer.draw(step);
    }
    
    // 更新步驟日誌的高亮
    document.querySelectorAll('[id^="lz77-tok-item-"]').forEach((item, index) => {
        if (index === idx) {
            item.classList.add('bg-teal-950', 'border-teal-700');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('bg-teal-950', 'border-teal-700');
        }
    });
    
    // 更新解說文字
    const tok = step.token;
    let charDisp = tok.next_char;
    if (charDisp === ' ') charDisp = '⎵ (空格)';
    else if (charDisp === '\n') charDisp = '↵ (換行)';
    else if (charDisp === '\t') charDisp = '⇥ (製表)';
    else if (charDisp === '') charDisp = 'EOF (結束)';
    
    let explanationText = "";
    if (tok.length > 0) {
        explanationText = `從位置 ${step.index} 出發，往前尋找到匹配長度 ${tok.length} 字元（往前偏移 Offset 為 ${tok.offset} 字元，即 '${step.match_string}'）；下一個新讀入的字元為 '${charDisp}'。`;
    } else {
        explanationText = `位置 ${step.index} 處未找到匹配，輸出字元本身：'${charDisp}'。`;
    }
    
    document.getElementById('lz77StepExplanation').textContent = `[Step ${idx+1}/${appState.lz77Steps.length}] ${explanationText}`;
}

function lz77StepNext() {
    console.log("[main.js] lz77StepNext() clicked. lz77CurrentStep:", appState.lz77CurrentStep);
    if (!appState.lz77Steps) return;
    
    // 確保當前步驟為有效數字
    if (typeof appState.lz77CurrentStep !== 'number' || Number.isNaN(appState.lz77CurrentStep)) {
        appState.lz77CurrentStep = 0;
    }
    
    if (appState.lz77CurrentStep >= appState.lz77Steps.length - 1) {
        console.log("[main.js] lz77StepNext() reached the end of steps.");
        pauseLz77Animation();
        const playBtn = document.getElementById('lz77PlayBtn');
        if (playBtn) playBtn.textContent = '▶️ 播放';
        showNotification('動畫播放完成！', 'info');
        return;
    }
    
    showLz77Step(appState.lz77CurrentStep + 1);
}

function toggleLz77Play() {
    console.log("[main.js] toggleLz77Play() clicked. appState.lz77Playing:", appState.lz77Playing, "lz77CurrentStep:", appState.lz77CurrentStep);
    if (!appState.lz77Steps) return;
    
    // 確保當前步驟為有效數字
    if (typeof appState.lz77CurrentStep !== 'number' || Number.isNaN(appState.lz77CurrentStep)) {
        appState.lz77CurrentStep = 0;
    }
    
    const playBtn = document.getElementById('lz77PlayBtn');
    
    if (appState.lz77Playing) {
        pauseLz77Animation();
    } else {
        // 如果已經在最後一步，點擊播放時自動跳回第 0 步重新播放
        if (appState.lz77CurrentStep >= appState.lz77Steps.length - 1) {
            console.log("[main.js] toggleLz77Play() wrapping around to step 0.");
            appState.lz77CurrentStep = 0;
            showLz77Step(0);
        }
        appState.lz77Playing = true;
        playBtn.textContent = '⏸️ 暫停';
        runLz77Autoplay();
    }
}

function pauseLz77Animation() {
    console.log("[main.js] pauseLz77Animation() called.");
    appState.lz77Playing = false;
    const playBtn = document.getElementById('lz77PlayBtn');
    if (playBtn) playBtn.textContent = '▶️ 繼續';
    
    if (appState.lz77Timer) {
        clearTimeout(appState.lz77Timer);
        appState.lz77Timer = null;
    }
}

function resetLz77Animation() {
    console.log("[main.js] resetLz77Animation() called.");
    pauseLz77Animation();
    appState.lz77CurrentStep = 0;
    
    const playBtn = document.getElementById('lz77PlayBtn');
    if (playBtn) playBtn.textContent = '▶️ 播放';
    
    if (appState.lz77Steps && appState.lz77Steps.length > 0) {
        showLz77Step(0);
    } else {
        if (appState.lz77Visualizer) {
            appState.lz77Visualizer.clear();
        }
        const exp = document.getElementById('lz77StepExplanation');
        if (exp) exp.textContent = "等待播放...";
        const log = document.getElementById('lz77TokenLog');
        if (log) log.innerHTML = "";
        const grid = document.getElementById('lzhCodeTableGrid');
        if (grid) grid.innerHTML = "";
    }
}

function runLz77Autoplay() {
    console.log("[main.js] runLz77Autoplay() tick. lz77Playing:", appState.lz77Playing, "lz77CurrentStep:", appState.lz77CurrentStep);
    if (!appState.lz77Playing || !appState.lz77Steps) return;
    
    // 確保當前步驟為有效數字
    if (typeof appState.lz77CurrentStep !== 'number' || Number.isNaN(appState.lz77CurrentStep)) {
        appState.lz77CurrentStep = 0;
    }
    
    if (appState.lz77CurrentStep >= appState.lz77Steps.length - 1) {
        console.log("[main.js] runLz77Autoplay() reached the end of steps.");
        pauseLz77Animation();
        const playBtn = document.getElementById('lz77PlayBtn');
        if (playBtn) playBtn.textContent = '▶️ 播放';
        showNotification('動畫播放完成！', 'info');
        return;
    }
    
    lz77StepNext();
    
    // 如果在執行 lz77StepNext 後動畫被暫停（如到達最後一步），則不再排定計時器
    if (!appState.lz77Playing) return;
    
    // 讀取速度滑桿數值，計算延遲時間（基準延遲為 800ms）
    const speedInput = document.getElementById('lz77AnimationSpeed');
    const speed = speedInput ? parseFloat(speedInput.value) : 1;
    const delay = Math.round(800 / speed);
    
    appState.lz77Timer = setTimeout(runLz77Autoplay, delay);
}
