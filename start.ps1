# 統一啟動腳本 - PowerShell 版本
# 使用方法: Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process; .\start.ps1

param(
    [switch]$NoWait = $false
)

# 設定標題
$host.UI.RawUI.WindowTitle = "Huffman 壓縮可視化 - 服務啟動"

# 清屏
Clear-Host

Write-Host "`n" -ForegroundColor Green
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Huffman 壓縮可視化 - 統一啟動服務 (PowerShell)            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor Green

# 獲取腳本所在目錄
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# 檢查 Python
Write-Host "🔍 檢查環境..." -ForegroundColor Yellow

$pythonCmd = "python"
if (Test-Path ".\.venv\Scripts\python.exe") {
    $pythonCmd = ".\.venv\Scripts\python.exe"
    Write-Host "💡 檢測到虛擬環境，將優先使用虛擬環境的 Python" -ForegroundColor Cyan
}

$pythonTest = & $pythonCmd --version 2>$null
if (-not $?) {
    Write-Host "❌ 錯誤: 找不到 Python" -ForegroundColor Red
    Write-Host "`n請確保 Python 已安裝並添加到 PATH`n" -ForegroundColor Yellow
    Read-Host "按 Enter 退出"
    exit 1
}

Write-Host "✅ Python 運行環境: $pythonTest" -ForegroundColor Green

# 檢查檔案
$files = @(
    "start.py",
    "backend",
    "frontend"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ 找到 $file" -ForegroundColor Green
    } else {
        Write-Host "❌ 找不到 $file" -ForegroundColor Red
        Read-Host "按 Enter 退出"
        exit 1
    }
}

Write-Host "`n" -ForegroundColor Green

# 啟動服務
Write-Host "📦 啟動服務中..." -ForegroundColor Yellow
Write-Host "`n" -ForegroundColor Green

& $pythonCmd start.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n❌ 服務啟動失敗 (代碼: $LASTEXITCODE)" -ForegroundColor Red
}

Write-Host "`n按 Enter 退出..." -ForegroundColor Yellow
Read-Host