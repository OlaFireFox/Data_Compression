#!/usr/bin/env python3
"""
統一啟動腳本 - 同時啟動前端和後端
使用方法: python start.py
"""

import subprocess
import time
import os
import sys
import signal
from pathlib import Path

# 獲取專案根目錄
PROJECT_ROOT = Path(__file__).parent

# 子進程列表
processes = []

def print_header():
    """打印標題"""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║   Huffman 壓縮可視化 - 統一啟動服務                          ║
╚══════════════════════════════════════════════════════════════╝
    """)

def check_and_install_dependencies():
    """檢查並安裝後端依賴"""
    print("🔍 檢查依賴...")
    backend_dir = PROJECT_ROOT / "backend"
    req_file = backend_dir / "requirements.txt"
    
    if not req_file.exists():
        print(f"❌ 找不到 requirements.txt: {req_file}")
        return False
    
    try:
        # 檢查 fastapi 是否已安裝
        import fastapi
        print("✅ 依賴已安裝")
        return True
    except ImportError:
        print("⚠️  缺少依賴，正在安裝...")
        print(f"📦 安裝來源: {req_file}")
        
        try:
            # 安裝依賴
            result = subprocess.run(
                [sys.executable, "-m", "pip", "install", "-r", str(req_file)],
                cwd=str(backend_dir),
                capture_output=True,
                text=True,
                timeout=300  # 10 分鐘超時
            )
            
            if result.returncode == 0:
                print("✅ 依賴安裝成功")
                return True
            else:
                print(f"❌ 安裝失敗:")
                print(result.stdout)
                print(result.stderr)
                return False
        except subprocess.TimeoutExpired:
            print("❌ 安裝超時")
            return False
        except Exception as e:
            print(f"❌ 安裝出錯: {e}")
            return False

def start_backend():
    """啟動後端服務"""
    print("📦 啟動後端服務...")
    backend_dir = PROJECT_ROOT / "backend"
    
    if not backend_dir.exists():
        print("❌ 後端目錄不存在:", backend_dir)
        return None
    
    try:
        # 在後端目錄啟動 uvicorn
        proc = subprocess.Popen(
            [sys.executable, "run.py"],
            cwd=str(backend_dir),
            stdout=None,  # 直接輸出到終端
            stderr=None,  # 直接輸出到終端
            text=True
        )
        print(f"✅ 後端服務已啟動 (PID: {proc.pid})")
        print(f"   地址: http://127.0.0.1:8000")
        print(f"   文件: {backend_dir}/run.py")
        return proc
    except Exception as e:
        print(f"❌ 啟動後端失敗: {e}")
        return None

def start_frontend():
    """啟動前端服務"""
    print("\n🎨 啟動前端服務...")
    frontend_dir = PROJECT_ROOT / "frontend"
    
    if not frontend_dir.exists():
        print("❌ 前端目錄不存在:", frontend_dir)
        return None
    
    try:
        # 在前端目錄啟動開發伺服器
        proc = subprocess.Popen(
            [sys.executable, "server.py"],
            cwd=str(frontend_dir),
            stdout=None,  # 直接輸出到終端
            stderr=None,  # 直接輸出到終端
            text=True
        )
        print(f"✅ 前端服務已啟動 (PID: {proc.pid})")
        print(f"   地址: http://localhost:3000")
        print(f"   文件: {frontend_dir}/server.py")
        return proc
    except Exception as e:
        print(f"❌ 啟動前端失敗: {e}")
        return None

def monitor_processes():
    """監控子進程"""
    print("\n⏳ 監控服務運行狀態...")
    while True:
        try:
            time.sleep(1)
            
        except KeyboardInterrupt:
            print("\n\n🛑 收到停止信號，正在關閉所有服務...")
            cleanup()
            break
        except Exception as e:
            print(f"監控錯誤: {e}")

def cleanup():
    """清理進程"""
    print("\n清理進程中...")
    
    for i, proc in enumerate(processes):
        if proc is None:
            continue
        
        try:
            # 優雅地終止進程
            proc.terminate()
            
            # 等待最多 3 秒
            try:
                proc.wait(timeout=3)
                print(f"✅ 進程 {i+1} 已關閉 (PID: {proc.pid})")
            except subprocess.TimeoutExpired:
                # 強制終止
                proc.kill()
                proc.wait()
                print(f"✅ 進程 {i+1} 已強制終止 (PID: {proc.pid})")
        except Exception as e:
            print(f"❌ 終止進程 {i+1} 失敗: {e}")
    
    print("\n👋 所有服務已停止\n")

def signal_handler(signum, frame):
    """信號處理器"""
    cleanup()
    sys.exit(0)

def main():
    """主函數"""
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    print_header()
    
    # 設置信號處理
    signal.signal(signal.SIGINT, signal_handler)
    
    # 檢查並安裝依賴
    print()
    if not check_and_install_dependencies():
        print("\n❌ 無法安裝依賴，請手動運行:")
        print(f"   cd backend")
        print(f"   pip install -r requirements.txt")
        sys.exit(1)
    
    print()
    
    # 啟動後端
    backend_proc = start_backend()
    if backend_proc:
        processes.append(backend_proc)
    else:
        print("⚠️  後端啟動失敗，繼續啟動前端...\n")
    
    # 等待後端就緒
    time.sleep(2)
    
    # 啟動前端
    frontend_proc = start_frontend()
    if frontend_proc:
        processes.append(frontend_proc)
    else:
        print("⚠️  前端啟動失敗")
    
    # 檢查是否至少有一個服務成功啟動
    if not any(processes):
        print("\n❌ 無法啟動任何服務，正在退出...")
        sys.exit(1)
    
    print("""
╔══════════════════════════════════════════════════════════════╗
║                  所有服務已啟動! 🎉                          ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  📱 打開瀏覽器訪問:   http://localhost:3000                  ║
║                                                              ║
║  後端 API 地址:       http://127.0.0.1:8000                 ║
║                                                              ║
║  按 Ctrl+C 停止所有服務                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    """)
    
    # 監控進程
    monitor_processes()

if __name__ == "__main__":
    main()
