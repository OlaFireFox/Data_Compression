/**
 * 傳輸速度對比動畫模塊
 * 使用 GSAP 實現 8-bit 原始傳輸 vs Huffman 壓縮傳輸的並行對比動畫
 */

class TransmissionAnimator {
    constructor() {
        this.originalBit = document.getElementById('originalBit');
        this.huffmanBit = document.getElementById('huffmanBit');
        this.svg = document.getElementById('transmissionSVG');
        
        this.statusElements = {
            line1: document.getElementById('statusLine1'),
            line2: document.getElementById('statusLine2'),
            line3: document.getElementById('statusLine3'),
            line4: document.getElementById('statusLine4'),
            line5: document.getElementById('statusLine5')
        };

        this.timeline = null;
        this.isRunning = false;
        this.currentCharIndex = 0;
        this.text = '';
        this.codeTable = {};
        this.frequencies = {};
        this.characters = [];
        this.animationSpeed = 1;

        // SVG 容器的座標系統 (基於新的 viewBox="0 0 500 120")
        this.svgWidth = 500;
        this.svgHeight = 120;
        this.trackLength = 460; // 從 20 到 480 的軌道長度
        this.originalTrackY = 40;
        this.huffmanTrackY = 105;
    }

    /**
     * 初始化動畫數據
     */
    initialize(text, codeTable, frequencies) {
        this.text = text;
        this.codeTable = codeTable;
        this.frequencies = frequencies;
        this.characters = Array.from(text);
        this.currentCharIndex = 0;

        // 重置位置到起點（SVG 圓圈使用 attr.cx 屬性）
        gsap.set(this.originalBit, { attr: { cx: 20 } });
        gsap.set(this.huffmanBit, { attr: { cx: 20 } });

        this.updateStatus(
            '✓ 準備就緒',
            `總共 ${this.characters.length} 個字符`,
            `編碼表已載入`,
            `壓縮率待計算`,
            ''
        );
    }

    /**
     * 播放完整的傳輸動畫
     */
    async playFullAnimation(speed = 1) {
        this.animationSpeed = speed;
        this.isRunning = true;

        for (let i = 0; i < this.characters.length; i++) {
            if (!this.isRunning) break;
            
            this.currentCharIndex = i;
            await this.animateCharacter(i);
        }

        this.isRunning = false;
        this.updateStatus(
            '✅ 傳輸完成',
            `所有 ${this.characters.length} 個字符已處理`,
            '',
            '',
            ''
        );
    }

    /**
     * 動畫單個字符的傳輸
     */
    animateCharacter(charIndex) {
        return new Promise((resolve) => {
            const char = this.characters[charIndex];
            const code = this.codeTable[char];
            const freq = this.frequencies[char];

            if (!code) {
                resolve();
                return;
            }

            // 計算動畫時長
            const originalBitDuration = 0.25; // 8-bit 每位 0.25 秒 = 2 秒總時長
            const huffmanBitDuration = 1 / this.animationSpeed; // 1 bit = 1 秒（根據速度調整）
            
            const originalTotalTime = 8 * originalBitDuration; // 2 秒
            const huffmanTotalTime = code.length * huffmanBitDuration; // 動態時長

            // 更新狀態
            this.updateStatus(
                `正在處理字符: '${char === ' ' ? '⎵' : char}'`,
                `頻率: ${freq} 次`,
                `編碼: ${code}`,
                `長度: ${code.length} bits (原始: 8 bits)`,
                `時長: Huffman ${huffmanTotalTime.toFixed(2)}s vs 原始 ${originalTotalTime.toFixed(2)}s`
            );

            // 創建並行的傳輸動畫
            const animationTimeline = gsap.timeline();

            // 原始傳輸：恆定速度向右移動（使用 cx 屬性）
            animationTimeline.to(this.originalBit, {
                attr: { cx: this.trackLength + 20 },
                duration: originalTotalTime,
                ease: 'none',
                onUpdate: () => {
                    // 實時更新進度指示
                    this.updateTransmissionProgress();
                }
            }, 0);

            // Huffman 傳輸：根據位數動態速度（使用 cx 屬性）
            animationTimeline.to(this.huffmanBit, {
                attr: { cx: this.trackLength + 20 },
                duration: huffmanTotalTime,
                ease: 'none',
                onUpdate: () => {
                    this.updateTransmissionProgress();
                }
            }, 0);

            // 在動畫結束時調用 resolve
            animationTimeline.call(() => {
                resolve();
            });

            this.timeline = animationTimeline;
        });
    }

    /**
     * 停止動畫
     */
    stop() {
        this.isRunning = false;
        if (this.timeline) {
            this.timeline.kill();
        }
    }

    /**
     * 暫停動畫
     */
    pause() {
        if (this.timeline) {
            this.timeline.pause();
        }
    }

    /**
     * 繼續動畫
     */
    resume() {
        if (this.timeline) {
            this.timeline.resume();
        }
    }

    /**
     * 更新傳輸進度（用於視覺反饋）
     */
    updateTransmissionProgress() {
        // 根據位置計算進度百分比
        const originalCx = parseFloat(this.originalBit.getAttribute('cx')) || 20;
        const huffmanCx = parseFloat(this.huffmanBit.getAttribute('cx')) || 20;

        const originalProgress = (originalCx - 20) / this.trackLength;
        const huffmanProgress = (huffmanCx - 20) / this.trackLength;

        // 可以在這裡添加進度條或其他視覺效果
    }

    /**
     * 更新狀態文本
     */
    updateStatus(line1, line2, line3, line4, line5) {
        if (line1) this.statusElements.line1.textContent = line1;
        if (line2) this.statusElements.line2.textContent = line2;
        if (line3) this.statusElements.line3.textContent = line3;
        if (line4) this.statusElements.line4.textContent = line4;
        if (line5) this.statusElements.line5.textContent = line5;
    }

    /**
     * 重置動畫
     */
    reset() {
        this.stop();
        gsap.set(this.originalBit, { attr: { cx: 20 } });
        gsap.set(this.huffmanBit, { attr: { cx: 20 } });
        this.updateStatus('已重置', '等待開始...', '', '', '');
    }

    /**
     * 獲取統計數據
     */
    getStatistics() {
        if (this.characters.length === 0) return null;

        const originalTotalBits = this.characters.length * 8;
        const huffmanTotalBits = this.characters.reduce((sum, char) => {
            const code = this.codeTable[char];
            return sum + (code ? code.length : 0);
        }, 0);

        const compressionRatio = ((1 - huffmanTotalBits / originalTotalBits) * 100).toFixed(2);

        return {
            totalCharacters: this.characters.length,
            originalTotalBits,
            huffmanTotalBits,
            compressionRatio,
            speedup: (originalTotalBits / huffmanTotalBits).toFixed(2)
        };
    }
}

// 導出為全局變數
window.TransmissionAnimator = TransmissionAnimator;
