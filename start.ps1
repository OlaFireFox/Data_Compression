# Huffman Compression Visualization - Startup Script (PowerShell)
param(
    [switch]$NoWait = $false
)

# Set window title
$host.UI.RawUI.WindowTitle = "Huffman Compression - Startup"

Clear-Host

Write-Host "`n"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Huffman Compression Visualization - Startup Service    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "`n"

# Check Python environment
Write-Host "Checking Python environment..." -ForegroundColor Yellow

$pythonSystem = $null
if (Get-Command "py" -ErrorAction SilentlyContinue) {
    $pythonSystem = "py"
} elseif (Get-Command "python" -ErrorAction SilentlyContinue) {
    $pythonSystem = "python"
}

if ($null -eq $pythonSystem) {
    Write-Host "[ERROR] Python or py launcher not found!" -ForegroundColor Red
    Write-Host "Please ensure Python is installed and added to PATH.`n" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check or auto-create virtual environment (.venv)
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "Virtual environment (.venv) not found. Creating it now..." -ForegroundColor Yellow
    if ($pythonSystem -eq "py") {
        & py -m venv .venv
    } else {
        & python -m venv .venv
    }
    
    if (-not $?) {
        Write-Host "[ERROR] Failed to create virtual environment (.venv)!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    
    Write-Host "Virtual environment created successfully. Installing dependencies..." -ForegroundColor Green
    & .\.venv\Scripts\python.exe -m pip install --upgrade pip
    & .\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
    if (-not $?) {
        Write-Host "[ERROR] Failed to install dependencies!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "All dependencies installed successfully!" -ForegroundColor Green
}

$pythonCmd = ".\.venv\Scripts\python.exe"
$pythonTest = & $pythonCmd --version
Write-Host "Using virtual environment: .venv ($pythonTest)" -ForegroundColor Cyan

# Check files
$files = @(
    "start.py",
    "backend",
    "frontend"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "[OK] Found $file" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Missing $file!" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host "`n"

# Start service
Write-Host "Starting services..." -ForegroundColor Yellow
Write-Host "`n"

& $pythonCmd start.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Service startup failed (Exit code: $LASTEXITCODE)" -ForegroundColor Red
}

Write-Host "`nPress Enter to exit..." -ForegroundColor Yellow
Read-Host