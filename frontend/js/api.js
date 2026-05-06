/**
 * API 通信層
 */

const API_BASE_URL = 'http://localhost:8000/api';
const API_TIMEOUT = 30000; // 30 秒超時

/**
 * API 回應包裝類
 */
class APIResponse {
    constructor(success, data, error = null) {
        this.success = success;
        this.data = data;
        this.error = error;
    }
}

/**
 * 檢查後端 API 連線
 */
async function checkAPIConnection() {
    try {
        const response = await fetch('http://localhost:8000/health', {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        console.error('API 連線檢查失敗:', error);
        return false;
    }
}

/**
 * 上傳檔案進行壓縮
 * @param {File} file - 上傳的檔案
 * @param {Function} onProgress - 進度回調
 * @returns {Promise<APIResponse>}
 */
async function uploadAndCompress(file, onProgress = null) {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            // 監聽上傳進度
            if (onProgress) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percentComplete = Math.round((e.loaded / e.total) * 100);
                        onProgress(percentComplete);
                    }
                });
            }

            // 監聽完成
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        if (data.success) {
                            resolve(new APIResponse(true, data));
                        } else {
                            resolve(new APIResponse(false, null, data.message));
                        }
                    } catch (e) {
                        reject(new Error('解析回應失敗: ' + e.message));
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        resolve(new APIResponse(false, null, error.detail || '壓縮失敗'));
                    } catch (e) {
                        resolve(new APIResponse(false, null, `HTTP ${xhr.status}`));
                    }
                }
            });

            // 監聽錯誤
            xhr.addEventListener('error', () => {
                reject(new Error('網路錯誤'));
            });

            xhr.addEventListener('abort', () => {
                reject(new Error('請求被中止'));
            });

            // 設置超時
            xhr.timeout = API_TIMEOUT;
            xhr.addEventListener('timeout', () => {
                reject(new Error('請求超時'));
            });

            // 發送請求
            xhr.open('POST', `${API_BASE_URL}/upload`);
            xhr.send(formData);
        });

    } catch (error) {
        return new APIResponse(false, null, error.message);
    }
}

/**
 * 解壓縮
 * @param {string} encodedText - 編碼文本
 * @param {Object} codeTable - 編碼表
 * @returns {Promise<APIResponse>}
 */
async function decompress(encodedText, codeTable) {
    try {
        const response = await fetch(`${API_BASE_URL}/decompress`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                encoded_text: encodedText,
                code_table: codeTable
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            return new APIResponse(true, data);
        } else {
            return new APIResponse(false, null, data.message || data.detail);
        }
    } catch (error) {
        return new APIResponse(false, null, error.message);
    }
}

/**
 * 下載壓縮檔案
 * @param {string} filename - 檔案名稱
 * @returns {Promise<Blob>}
 */
async function downloadCompressed(filename) {
    try {
        const response = await fetch(`${API_BASE_URL}/download/${filename}`);
        if (response.ok) {
            return await response.blob();
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        throw new Error('下載失敗: ' + error.message);
    }
}

/**
 * 獲取壓縮歷史
 * @returns {Promise<APIResponse>}
 */
async function getCompressionHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/compression-history`);
        const data = await response.json();

        if (response.ok && data.success) {
            return new APIResponse(true, data);
        } else {
            return new APIResponse(false, null, data.message);
        }
    } catch (error) {
        return new APIResponse(false, null, error.message);
    }
}

/**
 * 格式化檔案大小
 * @param {number} bytes - 字節數
 * @returns {string} 格式化後的大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 將位數轉換為字節近似值
 * @param {number} bits - 位數
 * @returns {string} 格式化後的大小
 */
function formatBits(bits) {
    const bytes = Math.ceil(bits / 8);
    return formatFileSize(bytes) + ` (${bits} bits)`;
}

// 導出為全局變數
window.API = {
    checkAPIConnection,
    uploadAndCompress,
    decompress,
    downloadCompressed,
    getCompressionHistory,
    formatFileSize,
    formatBits
};
