#!/usr/bin/env python3
"""
診斷腳本 - 檢查所有配置和依賴
"""

import sys
import subprocess
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent

def print_section(title):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}\n")

def check_python():
    """檢查 Python 版本"""
    print_section("🐍 Python 環境")
    
    print(f"Python 版本: {sys.version}")
    print(f"Python 路徑: {sys.executable}")
    
    # 檢查關鍵模塊
    modules = ['subprocess', 'pathlib', 'time', 'signal']
    print(f"\n檢查標準庫模塊...")
    for mod in modules:
        try:
            __import__(mod)
            print(f"  ✅ {mod}")
        except ImportError:
            print(f"  ❌ {mod} - 缺失!")
    
    return True

def check_backend():
    """檢查後端"""
    print_section("📦 後端服務")
    
    backend_dir = PROJECT_ROOT / "backend"
    
    # 檢查目錄
    if not backend_dir.exists():
        print(f"❌ 後端目錄不存在: {backend_dir}")
        return False
    
    print(f"✅ 後端目錄: {backend_dir}")
    
    # 檢查 run.py
    run_py = backend_dir / "run.py"
    if not run_py.exists():
        print(f"❌ run.py 不存在: {run_py}")
        return False
    
    print(f"✅ run.py 存在")
    
    # 檢查 requirements.txt
    req_file = backend_dir / "requirements.txt"
    if req_file.exists():
        print(f"✅ requirements.txt 存在")
        with open(req_file) as f:
            print(f"\n內容:\n{f.read()}")
    else:
        print(f"⚠️  requirements.txt 不存在")
    
    # 檢查依賴
    print(f"\n檢查 Python 依賴...")
    deps = ['fastapi', 'uvicorn', 'pydantic']
    for dep in deps:
        try:
            __import__(dep)
            print(f"  ✅ {dep}")
        except ImportError:
            print(f"  ❌ {dep} - 未安裝!")
    
    # 試試導入 app
    print(f"\n檢查應用程式...")
    try:
        sys.path.insert(0, str(backend_dir))
        from app.main import app
        print(f"✅ 可以導入 app.main:app")
        return True
    except Exception as e:
        print(f"❌ 無法導入 app: {e}")
        return False

def check_frontend():
    """檢查前端"""
    print_section("🎨 前端服務")
    
    frontend_dir = PROJECT_ROOT / "frontend"
    
    # 檢查目錄
    if not frontend_dir.exists():
        print(f"❌ 前端目錄不存在: {frontend_dir}")
        return False
    
    print(f"✅ 前端目錄: {frontend_dir}")
    
    # 檢查 server.py
    server_py = frontend_dir / "server.py"
    if not server_py.exists():
        print(f"❌ server.py 不存在: {server_py}")
        return False
    
    print(f"✅ server.py 存在")
    
    # 檢查 index.html
    index_html = frontend_dir / "index.html"
    if not index_html.exists():
        print(f"❌ index.html 不存在: {index_html}")
        return False
    
    print(f"✅ index.html 存在")
    
    # 檢查 js 目錄
    js_dir = frontend_dir / "js"
    if not js_dir.exists():
        print(f"❌ js 目錄不存在: {js_dir}")
        return False
    
    print(f"✅ js 目錄存在")
    
    # 檢查 main.js
    main_js = js_dir / "main.js"
    if not main_js.exists():
        print(f"❌ main.js 不存在: {main_js}")
        return False
    
    print(f"✅ main.js 存在")
    
    return True

def check_ports():
    """檢查端口是否被佔用"""
    print_section("🔌 端口檢查")
    
    ports = [3000, 8000]
    
    for port in ports:
        try:
            result = subprocess.run(
                ["netstat", "-ano"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if f":{port}" in result.stdout:
                print(f"⚠️  端口 {port} 可能被佔用")
                # 顯示佔用該端口的進程
                for line in result.stdout.split('\n'):
                    if f":{port}" in line:
                        print(f"   {line.strip()}")
            else:
                print(f"✅ 端口 {port} 空閒")
        except Exception as e:
            print(f"⚠️  無法檢查端口 {port}: {e}")

def test_run_backend():
    """測試後端啟動"""
    print_section("🧪 後端啟動測試")
    
    backend_dir = PROJECT_ROOT / "backend"
    
    print("正在啟動後端 (5 秒超時)...")
    
    try:
        proc = subprocess.Popen(
            [sys.executable, "run.py"],
            cwd=str(backend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 等待 5 秒
        try:
            proc.wait(timeout=5)
            stdout, stderr = proc.communicate()
            
            if stdout:
                print(f"\n標準輸出:\n{stdout}")
            if stderr:
                print(f"\n標準錯誤:\n{stderr}")
            
            print(f"\n❌ 進程立即終止 (代碼: {proc.returncode})")
            return False
        except subprocess.TimeoutExpired:
            proc.terminate()
            print(f"✅ 後端進程仍在運行 (可以啟動)")
            return True
            
    except Exception as e:
        print(f"❌ 啟動失敗: {e}")
        return False

def test_run_frontend():
    """測試前端啟動"""
    print_section("🧪 前端啟動測試")
    
    frontend_dir = PROJECT_ROOT / "frontend"
    
    print("正在啟動前端 (5 秒超時)...")
    
    try:
        proc = subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=str(frontend_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # 等待 5 秒
        try:
            proc.wait(timeout=5)
            stdout, stderr = proc.communicate()
            
            if stdout:
                print(f"\n標準輸出:\n{stdout}")
            if stderr:
                print(f"\n標準錯誤:\n{stderr}")
            
            print(f"\n❌ 進程立即終止 (代碼: {proc.returncode})")
            return False
        except subprocess.TimeoutExpired:
            proc.terminate()
            print(f"✅ 前端進程仍在運行 (可以啟動)")
            return True
            
    except Exception as e:
        print(f"❌ 啟動失敗: {e}")
        return False

def main():
    """主診斷程式"""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║         Huffman 壓縮可視化 - 診斷工具                        ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    results = []
    
    # 運行檢查
    results.append(("Python", check_python()))
    results.append(("後端", check_backend()))
    results.append(("前端", check_frontend()))
    check_ports()
    results.append(("後端啟動", test_run_backend()))
    results.append(("前端啟動", test_run_frontend()))
    
    # 摘要
    print_section("📊 診斷摘要")
    
    for name, result in results:
        status = "✅" if result else "❌"
        print(f"{status} {name}")
    
    all_ok = all(r for _, r in results)
    
    if all_ok:
        print(f"\n🎉 所有檢查通過！可以運行 start.py")
    else:
        print(f"\n⚠️  發現問題，請解決上述錯誤")
    
    print()

if __name__ == "__main__":
    main()
