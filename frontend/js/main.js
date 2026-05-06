/**
 * 主應用邏輯
 */

// ============= 全局狀態 =============
const appState = {
    currentFile: null,
    compressionResult: null,
    frequencyChart: null,
    treeVisualizer: null,
    transmissionAnimator: null,  // ⭐ 新增傳輸動畫器
    animationPlaying: false,
    currentStepIndex: 0,
    originalText: null  // ⭐ 保存原始文本用於傳輸動畫
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

    // 播放速度
    elements.animationSpeed.addEventListener('input', (e) => {
        elements.speedValue.textContent = e.target.value + 'x';
    });

    // 點擊模態框外部關閉
    elements.animationModal.addEventListener('click', (e) => {
        if (e.target === elements.animationModal) {
            closeAnimationModal();
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

    elements.animationModal.classList.remove('hidden');

    // 初始化樹可視化器
    if (!appState.treeVisualizer) {
        appState.treeVisualizer = new HuffmanTreeVisualizer('treeCanvas');
    }

    appState.treeVisualizer.loadData(
        appState.compressionResult.tree_structure,
        appState.compressionResult.build_steps
    );

    // ⭐ 初始化傳輸動畫器
    if (!appState.transmissionAnimator) {
        appState.transmissionAnimator = new TransmissionAnimator();
    }
    
    if (appState.originalText) {
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
    if (appState.animationPlaying) {
        stopAnimation();
    } else {
        playAnimation();
    }
}

async function playAnimation() {
    appState.animationPlaying = true;
    elements.playBtn.textContent = '⏸️ 暫停';
    elements.playBtn.disabled = true;
    elements.prevStepBtn.disabled = true;
    elements.nextStepBtn.disabled = true;

    const speed = parseFloat(elements.animationSpeed.value);

    // ⭐ 播放傳輸動畫而不是樹構建動畫
    if (appState.transmissionAnimator) {
        try {
            // 重置傳輸動畫
            appState.transmissionAnimator.reset();
            // 播放完整傳輸動畫
            await appState.transmissionAnimator.playFullAnimation(speed);
        } catch (error) {
            console.error('傳輸動畫錯誤:', error);
            showNotification('動畫播放失敗', 'error');
        }
    }

    stopAnimation();
}

function stopAnimation() {
    appState.animationPlaying = false;
    elements.playBtn.textContent = '▶️ 播放';
    elements.playBtn.disabled = false;
    elements.prevStepBtn.disabled = false;
    elements.nextStepBtn.disabled = false;

    // ⭐ 停止傳輸動畫
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
