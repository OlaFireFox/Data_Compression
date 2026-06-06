@echo off
REM 統一啟動腳本 - 雙擊執行
REM Author: Data Compression Visualization
REM Purpose: 同時啟動前端和後端服務

setlocal enabledelayedexpansion

REM 設定標題
title Huffman 壓縮可視化 - 服務啟動

REM 改變到腳本所在目錄
cd /d "%~dp0"

REM 清屏
cls

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║   Huffman 壓縮可視化 - 統一啟動服務                          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 🚀 正在啟動服務...
echo.

REM 檢查 Python 是否安裝並設定指令
set "PYTHON_SYSTEM="
py --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_SYSTEM=py"
) else (
    python --version >nul 2>&1
    if not errorlevel 1 (
        set "PYTHON_SYSTEM=python"
    )
)

if "%PYTHON_SYSTEM%"=="" (
    echo ❌ 錯誤: 找不到 Python
    echo.
    echo 請確保:
    echo 1. Python 已安裝
    echo 2. Python 已添加到 PATH
    echo.
    echo 訪問 https://www.python.org 下載 Python
    echo.
    pause
    exit /b 1
)

REM 檢查或自動建立虛擬環境
if not exist ".venv\Scripts\python.exe" (
    echo ⚠️ 未檢測到虛擬環境 .venv，正在自動為您建立...
    if "%PYTHON_SYSTEM%"=="py" (
        py -m venv .venv
    ) else (
        python -m venv .venv
    )
    
    if errorlevel 1 (
        echo ❌ 錯誤: 無法建立虛擬環境 .venv
        pause
        exit /b 1
    )
    
    echo ✅ 虛擬環境建立成功！正在安裝後端依賴套件...
    .venv\Scripts\python.exe -m pip install --upgrade pip
    .venv\Scripts\python.exe -m pip install -r backend\requirements.txt
    if errorlevel 1 (
        echo ❌ 錯誤: 依賴套件安裝失敗
        pause
        exit /b 1
    )
    echo ✅ 所有依賴套件安裝完成！
)

set "PYTHON_CMD=.venv\Scripts\python.exe"
echo 💡 使用虛擬環境的 Python 執行服務

REM 檢查 start.py 是否存在
if not exist "start.py" (
    echo ❌ 錯誤: 找不到 start.py
    echo.
    echo 請確保 start.py 在: %cd%
    echo.
    pause
    exit /b 1
)

REM 檢查後端目錄
if not exist "backend" (
    echo ❌ 錯誤: 找不到 backend 目錄
    echo.
    pause
    exit /b 1
)

REM 檢查前端目錄
if not exist "frontend" (
    echo ❌ 錯誤: 找不到 frontend 目錄
    echo.
    pause
    exit /b 1
)

echo ✅ 所有檢查通過
echo.

REM 啟動服務
echo 📦 啟動服務中...
echo.

%PYTHON_CMD% start.py

REM 如果 Python 返回非零代碼，顯示錯誤
if errorlevel 1 (
    echo.
    echo ❌ 服務啟動失敗
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ 服務已停止
echo.
pause