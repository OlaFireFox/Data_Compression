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
    nextStepBtn: document.getElementById('nextStepBtn'),
    animationSpeed: document.getElementById('animationSpeed'),
    speedValue: document.getElementById('speedValue'),
    stepsList: document.getElementById('stepsList'),
    apiStatus: document.getElementById('api-status'),
    notificationContainer: document.getElementById('notificationContainer')
};

// ============= 初始化 =============
document.addEventListener('DOMContentLoaded', () => {
    console.log('應用初始化中...');
    
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
    elements.nextStepBtn.addEventListener('click', () => nextStep());

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
    elements.resultOriginalSize.textContent = result.original_size;
    elements.resultCompressedSize.textContent = result.encoded_size;
    elements.resultCompressionRatio.textContent = result.compression_ratio;

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
        
        const filename = appState.compressionResult.compressed_filename || 
                        `${Date.now()}_compressed.bin`;
        
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

// ============= 動畫模態框 =============
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

            // 初始化傳輸動畫器
            if (!appState.transmissionAnimator) {
                const svgElement = document.getElementById('transmissionSVG');
                if (!svgElement) {
                    console.warn('⚠️ Transmission SVG element not found');
                } else {
                    console.log('✓ 創建傳輸動畫器');
                    appState.transmissionAnimator = new TransmissionAnimator();
                }
            }
            
            if (appState.transmissionAnimator && appState.originalText) {
                console.log(`✓ 初始化傳輸動畫器 (文本長度: ${appState.originalText.length})`);
                appState.transmissionAnimator.initialize(
                    appState.originalText,
                    appState.compressionResult.code_table,
                    appState.compressionResult.frequencies
                );
            }

            // 更新步驟信息
            elements.totalSteps.textContent = appState.compressionResult.build_steps.length;
            updateAnimationUI();

            // 生成步驟列表
            generateStepsList();

            // 顯示第一步
            if (appState.compressionResult.build_steps.length > 0) {
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

// ============= 動畫控制 =============
function showStep(stepIndex) {
    if (!appState.treeVisualizer || !appState.compressionResult) return;

    if (stepIndex < 0 || stepIndex >= appState.compressionResult.build_steps.length) {
        return;
    }

    appState.currentStepIndex = stepIndex;
    appState.treeVisualizer.showStep(stepIndex);

    const step = appState.compressionResult.build_steps[stepIndex];
    
    // 更新步驟信息
    elements.currentStep.textContent = stepIndex + 1;
    
    const leftChar = step.left_node.char || (step.left_node.is_leaf ? '?' : 'Σ');
    const rightChar = step.right_node.char || (step.right_node.is_leaf ? '?' : 'Σ');
    
    elements.leftNodeInfo.textContent = `${leftChar} (${step.left_node.freq})`;
    elements.rightNodeInfo.textContent = `${rightChar} (${step.right_node.freq})`;

    // 高亮對應的步驟列表項
    document.querySelectorAll('#stepsList .step-item').forEach((item, idx) => {
        if (idx === stepIndex) {
            item.classList.add('bg-blue-600', 'border-blue-400');
            item.classList.remove('bg-slate-700', 'border-slate-600');
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
    const maxSteps = appState.compressionResult.build_steps.length;
    if (appState.currentStepIndex < maxSteps - 1) {
        showStep(appState.currentStepIndex + 1);
    }
}

async function toggleAnimation() {
    console.log('\n🎮 toggleAnimation 被觸發');
    console.log(`   當前狀態: ${appState.animationPlaying ? '播放中' : '已停止'}`);
    console.log(`   樹可視化器: ${appState.treeVisualizer ? '✓' : '✗'}`);
    console.log(`   傳輸動畫器: ${appState.transmissionAnimator ? '✓' : '✗'}`);
    console.log(`   原始文本: ${appState.originalText ? `"${appState.originalText}"` : '✗'}`);
    
    if (appState.animationPlaying) {
        // 暫停動畫
        console.log('⏸️ 暫停動畫');
        pauseAnimation();
    } else {
        // 開始或繼續動畫
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

    // 防止重複播放
    if (appState.animationPlaying) {
        console.warn('⚠️ Animation already playing');
        return;
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('▶️ 開始播放動畫 - 樹與傳輸同步');
    console.log('═══════════════════════════════════════════════════');
    
    appState.animationPlaying = true;
    elements.playBtn.textContent = '⏸️ 暫停';
    elements.playBtn.disabled = false;
    elements.prevStepBtn.disabled = true;
    elements.nextStepBtn.disabled = true;
    elements.animationSpeed.disabled = false;
    appState.animationSpeed = parseFloat(elements.animationSpeed.value) || 1;

    const speed = appState.animationSpeed;
    const buildSteps = appState.compressionResult.build_steps;
    const uniqueChars = Object.keys(appState.compressionResult.code_table);
    
    // 計算時長
    const baseBitTime = 0.1; // 每個 bit 的時間（秒）
    const originalTotalTimePerChar = 8 * baseBitTime; // 0.8 秒

    console.log(`📊 動畫配置:`);
    console.log(`   速度: ${speed}x`);
    console.log(`   樹構建步驟: ${buildSteps.length}`);
    console.log(`   唯一字符: ${uniqueChars.length}`);
    console.log(`   原始文本: "${appState.originalText}" (${appState.originalText.length} 字符)`);
    console.log(`   原始 8-bit 時長: ${originalTotalTimePerChar.toFixed(2)}s`);
    console.log(`   傳輸動畫器: ${appState.transmissionAnimator ? '✓ 已初始化' : '✗ 未初始化'}`);
    console.log('───────────────────────────────────────────────────');

    try {
        // 重置狀態
        appState.currentStepIndex = 0;

        // 重置進度條 ⭐ 新增
        const originalBar = document.getElementById('originalProgressBar');
        const huffmanBar = document.getElementById('huffmanProgressBar');
        const originalText = document.getElementById('originalProgressText');
        const huffmanText = document.getElementById('huffmanProgressText');
        
        if (originalBar && huffmanBar) {
            gsap.set(originalBar, { attr: { width: 0 } });
            gsap.set(huffmanBar, { attr: { width: 0 } });
            if (originalText) originalText.textContent = '0%';
            if (huffmanText) huffmanText.textContent = '0%';
            console.log('✓ 進度條已重置');
        }

        // 重置傳輸動畫器
        if (appState.transmissionAnimator) {
            appState.transmissionAnimator.reset();
            console.log('✓ 傳輸動畫器已重置');
        }

        // 重置樹的狀態
        if (appState.treeVisualizer) {
            appState.treeVisualizer.drawTree();
            console.log('✓ 樹已重置');
        }

        // ⭐ 重置路徑追蹤狀態
        appState.lastCharPath = null;
        console.log('✓ 路徑追蹤已重置');

        console.log('\n═══════════════════════════════════════════════════');
        console.log('▶️ 開始播放動畫 - 智能路徑對比模式');
        console.log('═══════════════════════════════════════════════════\n');

        // ⭐ 主播放循环 - 路徑對比邏輯
        const textLength = appState.originalText.length;
        
        for (let charIdx = 0; charIdx < textLength; charIdx++) {
            if (!appState.animationPlaying) {
                console.log(`\n⏹️ 動畫被使用者中止 (字符 ${charIdx}/${textLength})`);
                break;
            }

            const char = appState.originalText[charIdx];
            console.log(`\n📍 字符 ${charIdx + 1}/${textLength}: '${char === ' ' ? '⎵' : char}'`);

            // ⭐ 同步更新：字符 → 對應的樹構建步驟
            let treeStepIdx = Math.min(charIdx, buildSteps.length - 1);
            
            if (charIdx < uniqueChars.length && treeStepIdx >= 0) {
                console.log(`   🌳 顯示樹構建步驟 ${treeStepIdx + 1}/${buildSteps.length}`);
                appState.treeVisualizer.showStep(treeStepIdx);
                appState.currentStepIndex = treeStepIdx;
                updateAnimationUI();
            }
            
            // ⭐ 樹路徑動畫和進度條動畫並行執行（不互相阻塞）
            console.log(`   🧠 執行路徑對比邏輯... 🎬 啟動進度條傳輸...`);
            
            // 並行啟動：路徑動畫和進度條動畫
            const pathAnimationPromise = appState.treeVisualizer.smartPathAnimation(
                char, 
                appState.lastCharPath, 
                speed
            );
            
            const transmissionAnimationPromise = playTransmissionCharacterForStep(charIdx, speed);
            
            // 等待兩個動畫都完成
            const [currentCharPath] = await Promise.all([
                pathAnimationPromise,
                transmissionAnimationPromise
            ]);
            
            // ⭐ 更新路徑追蹤狀態
            appState.lastCharPath = currentCharPath;
        }

        console.log('\n═══════════════════════════════════════════════════');
        console.log('✅ 所有字符傳輸完成 - 動畫播放結束');
        console.log('═══════════════════════════════════════════════════\n');
        stopAnimation();

    } catch (error) {
        console.error('❌ 動畫播放發生錯誤:');
        console.error(error);
        console.error(error.stack);
        showNotification('動畫播放失敗：' + error.message, 'error');
        stopAnimation();
    }
}

/**
 * 根據字符索引播放傳輸動畫 - ⭐ 進度條竞速模式
 * 使用 GSAP 控制進度條寬度百分比
 */
async function playTransmissionCharacterForStep(charIdx, speed = 1) {
    return new Promise((resolve) => {
        if (!appState.transmissionAnimator) {
            console.warn(`⚠️ 傳輸動畫器不可用，跳過字符 ${charIdx}`);
            setTimeout(resolve, 100);
            return;
        }

        if (!appState.originalText || charIdx >= appState.originalText.length) {
            console.warn(`⚠️ 字符索引超出範圍: ${charIdx}/${appState.originalText ? appState.originalText.length : '?'}`);
            setTimeout(resolve, 100);
            return;
        }

        const char = appState.originalText[charIdx];
        const code = appState.compressionResult.code_table[char];
        const freq = appState.compressionResult.frequencies[char];

        if (!code) {
            console.warn(`⚠️ 字符 '${char}' 無編碼對應`);
            setTimeout(resolve, 100);
            return;
        }

        // ⭐ 傳輸速度計算
        const baseBitTime = 0.1; // 每個 bit 的時間（秒）
        const originalTotalTime = 8 * baseBitTime; // 0.8 秒（固定，代表 8-bit 傳輸）
        const huffmanTotalTime = code.length * baseBitTime; // 動態時長
        const savedTime = originalTotalTime - huffmanTotalTime;
        const savedPercent = (savedTime / originalTotalTime * 100).toFixed(1);

        // ⭐ 位元傳輸進度計算 - 展現速度對比的關鍵
        // 原始 100% = 完成所有原始位元 (312 bits)
        // Huffman 100% = 完成所有 Huffman 位元 (194 bits)
        // 這樣 Huffman 會因位元更少而更早到達 100%
        const totalChars = appState.originalText.length;
        const totalOriginalBits = totalChars * 8; // 原始：312 bits
        
        // 計算總 Huffman 位元數（用於百分比計算）
        let totalHuffmanBits = 0;
        for (let i = 0; i < totalChars; i++) {
            const c = appState.originalText[i];
            totalHuffmanBits += appState.compressionResult.code_table[c].length;
        }
        
        // 計算從開始到當前字符的位元累計
        let originalBitsBeforeChar = charIdx * 8;
        let originalBitsAfterChar = (charIdx + 1) * 8;
        
        // 計算 Huffman 編碼的位元累計
        let huffmanBitsBeforeChar = 0;
        let huffmanBitsAfterChar = 0;
        for (let i = 0; i <= charIdx; i++) {
            const c = appState.originalText[i];
            huffmanBitsAfterChar += appState.compressionResult.code_table[c].length;
            if (i < charIdx) {
                huffmanBitsBeforeChar += appState.compressionResult.code_table[c].length;
            }
        }
        
        // 計算百分比 - 兩條進度條各有各的 100% 目標
        const startProgressOriginal = (originalBitsBeforeChar / totalOriginalBits) * 100;
        const endProgressOriginal = (originalBitsAfterChar / totalOriginalBits) * 100;
        
        const startProgressHuffman = (huffmanBitsBeforeChar / totalHuffmanBits) * 100;
        const endProgressHuffman = (huffmanBitsAfterChar / totalHuffmanBits) * 100;

        console.log(`   📍 字符: '${char === ' ' ? '⎵' : char}' (${charIdx + 1}/${totalChars}) | 編碼: ${code} (${code.length} bits) | 頻率: ${freq}`);
        console.log(`   📊 位元進度 - 原始: ${startProgressOriginal.toFixed(1)}% → ${endProgressOriginal.toFixed(1)}% | Huffman: ${startProgressHuffman.toFixed(1)}% → ${endProgressHuffman.toFixed(1)}%`);
        console.log(`   📏 位元: 原始 +${originalBitsAfterChar - originalBitsBeforeChar} bits | Huffman +${code.length} bits`);
        console.log(`   ⏱️  時長: 原始 ${originalTotalTime.toFixed(2)}s vs Huffman ${huffmanTotalTime.toFixed(2)}s | 節省 ${savedPercent}%`);

        // 更新狀態信息面板
        appState.transmissionAnimator.updateStatus(
            `字符 ${charIdx + 1}/${totalChars}: '${char === ' ' ? '⎵ (空格)' : char}'`,
            `編碼: ${code} (${code.length} bits)`,
            `頻率: ${freq} 次`,
            `時長: 原始 ${originalTotalTime.toFixed(2)}s vs Huffman ${huffmanTotalTime.toFixed(2)}s`,
            `進度: ${startProgressOriginal.toFixed(1)}% → ${endProgressOriginal.toFixed(1)}% | 節省 ${savedPercent}%`
        );

        // 檢查元素是否存在
        const originalBar = document.getElementById('originalProgressBar');
        const huffmanBar = document.getElementById('huffmanProgressBar');
        const originalText = document.getElementById('originalProgressText');
        const huffmanText = document.getElementById('huffmanProgressText');

        if (!originalBar || !huffmanBar) {
            console.error('❌ 進度條元素不存在!');
            resolve();
            return;
        }

        console.log(`   🎬 開始進度條竞速... (原始: ${originalTotalTime.toFixed(2)}s, Huffman: ${huffmanTotalTime.toFixed(2)}s)`);

        // ⭐ 建立並行傳輸動畫時間線
        const transmissionTimeline = gsap.timeline({
            onComplete: () => {
                console.log(`   ✅ 字符 '${char}' 傳輸完成`);
                appState.currentAnimationTimeline = null;
                resolve();
            }
        });

        // ⭐ 保存時間線到全局狀態
        appState.currentAnimationTimeline = transmissionTimeline;

        // 應用速度倍率
        if (speed !== 1) {
            transmissionTimeline.timeScale(speed);
            console.log(`   🎚️ 應用速度倍率: ${speed}x`);
        }

        // ⭐ SVG 容器的寬度（viewBox 寬度 = 500）
        // 進度條容器從 x=20 到 x=480，寬度 = 460
        const barContainerWidth = 460;

        // ⭐ 原始 8-bit 傳輸進度條：寬度基於百分比計算（修復寬度Bug）
        const originalStartWidth = (startProgressOriginal / 100) * barContainerWidth;
        const originalEndWidth = (endProgressOriginal / 100) * barContainerWidth;
        
        // 用一個代理對象來跟蹤進度百分比（用於文字更新）
        const originalProgress = { value: startProgressOriginal };
        
        transmissionTimeline.fromTo(
            originalBar,
            { attr: { width: originalStartWidth } },
            {
                attr: { width: originalEndWidth },
                duration: originalTotalTime / speed,
                ease: 'none',  // 線性，無緩動
                immediateRender: true
            },
            0
        );

        // ⭐ 更新原始進度文字 - 在動畫過程中實時更新
        transmissionTimeline.fromTo(
            originalProgress,
            { value: startProgressOriginal },
            {
                value: endProgressOriginal,
                duration: originalTotalTime / speed,
                ease: 'none',
                onUpdate: () => {
                    if (originalText) {
                        originalText.textContent = Math.round(originalProgress.value) + '%';
                    }
                }
            },
            0,
            '<'
        );

        // ⭐ Huffman 壓縮傳輸進度條：寬度基於位元比例計算
        const huffmanStartWidth = (startProgressHuffman / 100) * barContainerWidth;
        const huffmanEndWidth = (endProgressHuffman / 100) * barContainerWidth;

        // 用一個代理對象來跟蹤進度百分比（用於文字更新）
        const huffmanProgress = { value: startProgressHuffman };

        transmissionTimeline.fromTo(
            huffmanBar,
            { attr: { width: huffmanStartWidth } },
            {
                attr: { width: huffmanEndWidth },
                duration: huffmanTotalTime / speed,
                ease: 'none',  // 線性，無緩動
                immediateRender: true
            },
            0  // 同時開始
        );

        // ⭐ 更新 Huffman 進度文字 - 在動畫過程中實時更新
        transmissionTimeline.fromTo(
            huffmanProgress,
            { value: startProgressHuffman },
            {
                value: endProgressHuffman,
                duration: huffmanTotalTime / speed,
                ease: 'none',
                onUpdate: () => {
                    if (huffmanText) {
                        huffmanText.textContent = Math.round(huffmanProgress.value) + '%';
                    }
                }
            },
            0,
            '<'
        );

    });
}

function pauseAnimation() {
    console.log('⏸️ 暫停動畫');
    appState.animationPlaying = false;
    elements.playBtn.textContent = '▶️ 重新開始';
    elements.playBtn.disabled = false;

    // 暫停當前時間線
    if (appState.currentAnimationTimeline) {
        appState.currentAnimationTimeline.pause();
    }
}

function stopAnimation() {
    console.log('🛑 停止動畫');
    appState.animationPlaying = false;
    appState.currentAnimationTimeline = null;  // ⭐ 清除時間線引用
    elements.playBtn.textContent = '▶️ 播放';
    elements.playBtn.disabled = false;
    elements.prevStepBtn.disabled = false;
    elements.nextStepBtn.disabled = false;
    elements.animationSpeed.disabled = false;

    // 停止所有傳輸動畫
    if (appState.transmissionAnimator) {
        appState.transmissionAnimator.stop();
    }
}

function updateAnimationUI() {
    elements.prevStepBtn.disabled = appState.currentStepIndex === 0;
    elements.nextStepBtn.disabled = appState.currentStepIndex === appState.compressionResult.build_steps.length - 1;
}

function generateStepsList() {
    const stepsList = elements.stepsList;
    stepsList.innerHTML = '';

    appState.compressionResult.build_steps.forEach((step, idx) => {
        const item = document.createElement('div');
        item.className = 'step-item bg-slate-700 border border-slate-600 rounded p-3 cursor-pointer transition-all hover:border-blue-500 text-xs font-mono';
        
        const leftChar = step.left_node.char ? `'${step.left_node.char}'` : '...';
        const rightChar = step.right_node.char ? `'${step.right_node.char}'` : '...';
        
        item.innerHTML = `
            <div class="text-slate-300">第 ${idx + 1} 步</div>
            <div class="text-blue-400">${leftChar} (${step.left_node.freq}) + ${rightChar} (${step.right_node.freq}) = ${step.parent_node.freq}</div>
        `;
        
        item.addEventListener('click', () => showStep(idx));
        stepsList.appendChild(item);
    });
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

console.log('應用已載入');
