#!/usr/bin/env python3
"""
簡單的靜態檔案伺服器
用於本地開發和測試前端
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

PORT = 3000
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIRECTORY), **kwargs)
    
    def end_headers(self):
        # 添加 CORS 頭部
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

    def log_message(self, format, *args):
        # 自訂日誌格式
        print(f"[{self.log_date_time_string()}] {format % args}")

def start_server():
    """啟動伺服器"""
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"""
╔════════════════════════════════════════╗
║  Huffman 壓縮可視化 - 前端開發伺服器  ║
╚════════════════════════════════════════╝

✓ 伺服器運行在: http://localhost:{PORT}
✓ 靜態檔案目錄: {DIRECTORY}

按 Ctrl+C 停止伺服器
        """)
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n伺服器已停止 ✓")
            sys.exit(0)

if __name__ == '__main__':
    start_server()
