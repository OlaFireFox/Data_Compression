"""
LZ77 壓縮與解壓縮核心演算法
"""
import struct
from typing import List, Tuple, Dict, Any


class LZ77Coder:
    """
    LZ77 編碼器與解碼器
    使用滑動視窗字典法進行壓縮。
    二進位輸出格式為自訂的 .lz77 格式。
    """

    def __init__(self, window_size: int = 1024, lookahead_buffer_size: int = 32):
        self.window_size = window_size
        self.lookahead_buffer_size = lookahead_buffer_size

    def compress(self, text: str, max_vis_chars: int = 200) -> Tuple[List[Tuple[int, int, str]], List[Dict[str, Any]], Dict[str, Any]]:
        """
        執行 LZ77 壓縮。
        
        參數:
            text: 原始字串。
            max_vis_chars: 最大視覺化記錄字元數（防止前端記憶體崩潰）。
            
        返回:
            - tokens: 二進位壓縮所需的標記列表 (offset, length, next_char)。
            - steps: 前端逐步動畫所需的歷史軌跡。
            - stats: 壓縮率等統計指標。
        """
        tokens = []
        steps = []
        i = 0
        text_len = len(text)
        
        while i < text_len:
            # 1. 決定搜尋區與先行區範圍
            search_start = max(0, i - self.window_size)
            lookahead_len = min(self.lookahead_buffer_size, text_len - i)
            lookahead_buffer = text[i:i + lookahead_len]
            
            # 2. 尋找最長匹配 (Longest Match)
            best_offset = 0
            best_length = 0
            
            if lookahead_len >= 2:
                prefix = lookahead_buffer[:2]
                window = text[search_start:i]
                idx = window.find(prefix)
                while idx != -1:
                    match_pos = search_start + idx
                    match_len = 2
                    while match_len < lookahead_len:
                        if text[match_pos + match_len] == text[i + match_len]:
                            match_len += 1
                        else:
                            break
                    if match_len > best_length:
                        best_length = match_len
                        best_offset = i - match_pos
                    idx = window.find(prefix, idx + 1)
            
            # 3. 建立 Token 並移動指標
            next_char = ""
            if i + best_length < text_len:
                next_char = text[i + best_length]
            
            token = (best_offset, best_length, next_char)
            tokens.append(token)
            
            # 4. 記錄視覺化步驟 (僅記錄前 max_vis_chars 字元的步驟)
            if i < max_vis_chars:
                search_buffer = text[search_start:i]
                matched_str = text[i:i + best_length] if best_length > 0 else ""
                step = {
                    "index": i,
                    "search_start": search_start,
                    "search_end": i,
                    "search_buffer": search_buffer,
                    "lookahead_start": i,
                    "lookahead_end": i + lookahead_len,
                    "lookahead_buffer": lookahead_buffer,
                    "match_offset": best_offset,
                    "match_length": best_length,
                    "match_string": matched_str,
                    "token": {
                        "offset": best_offset,
                        "length": best_length,
                        "next_char": next_char
                    }
                }
                steps.append(step)
            
            # 前進步伐: 匹配長度 + 1 (因為帶有下一個字元)
            i += best_length + 1
            
        # 5. 計算統計指標
        # 估計壓縮大小 (以 byte 為單位)
        # 每個 token: offset(2 bytes) + length(1 byte) + next_char(UTF-8: 平均 1-2 bytes)
        est_compressed_size = 0
        for offset, length, char in tokens:
            char_bytes_len = len(char.encode('utf-8'))
            est_compressed_size += 2 + 1 + 1 + char_bytes_len # offset(2) + length(1) + next_char_len(1) + next_char(N)
            
        original_size = len(text.encode('utf-8'))
        compression_ratio = round(original_size / est_compressed_size, 2) if est_compressed_size > 0 else 0
        space_saving = round((1 - est_compressed_size / original_size) * 100, 2) if original_size > 0 else 0
        
        stats = {
            "original_size": original_size,
            "compressed_size": est_compressed_size,
            "compression_ratio": compression_ratio,
            "space_saving": space_saving,
            "token_count": len(tokens)
        }
        
        return tokens, steps, stats

    def decompress(self, tokens: List[Tuple[int, int, str]]) -> str:
        """
        執行 LZ77 解壓縮。
        
        參數:
            tokens: 壓縮時產生的標記列表 (offset, length, next_char)。
            
        返回:
            還原後的原始字串。
        """
        output = []
        for offset, length, next_char in tokens:
            if length > 0:
                # 從已輸出的緩衝區複製字元
                # 使用循環複製，以正確支援重疊匹配 (Overlapping Match)
                start_pos = len(output) - offset
                for j in range(length):
                    output.append(output[start_pos + j])
            
            if next_char:
                output.append(next_char)
                
        return "".join(output)

    def serialize(self, tokens: List[Tuple[int, int, str]]) -> bytes:
        """
        將標記列表序列化為二進位資料。
        格式:
          - 標頭 (12 bytes):
            - 4 bytes: Signature (b'LZ77')
            - 2 bytes: window_size (unsigned short)
            - 2 bytes: lookahead_buffer_size (unsigned short)
            - 4 bytes: token_count (unsigned int)
          - 每個 Token (可變長度):
            - 2 bytes: offset (unsigned short)
            - 1 byte: length (unsigned char)
            - 1 byte: next_char_bytes_len (unsigned char)
            - N bytes: next_char_bytes (UTF-8 編碼)
        """
        # 寫入標頭
        header = struct.pack(
            ">4sHHI", 
            b"LZ77", 
            self.window_size, 
            self.lookahead_buffer_size, 
            len(tokens)
        )
        
        body = bytearray()
        for offset, length, next_char in tokens:
            char_bytes = next_char.encode('utf-8')
            char_len = len(char_bytes)
            
            # 打包基本部分: offset(H), length(B), char_len(B)
            body.extend(struct.pack(">HBB", offset, length, char_len))
            # 寫入字元 bytes
            body.extend(char_bytes)
            
        return header + bytes(body)

    def deserialize(self, data: bytes) -> Tuple[List[Tuple[int, int, str]], Dict[str, Any]]:
        """
        將二進位資料還原成標記列表。
        """
        if len(data) < 12:
            raise ValueError("無效的資料：檔案長度小於標頭長度")
            
        # 解讀標頭
        sig, win_size, lookahead_size, token_count = struct.unpack(">4sHHI", data[:12])
        if sig != b"LZ77":
            raise ValueError("無效的檔案格式簽名，期望 'LZ77'")
            
        tokens = []
        offset = 12
        data_len = len(data)
        
        for _ in range(token_count):
            if offset + 4 > data_len:
                raise ValueError("解壓縮失敗：檔案損毀或截斷")
                
            # 讀取基本結構
            tok_offset, tok_length, char_len = struct.unpack(">HBB", data[offset:offset+4])
            offset += 4
            
            if offset + char_len > data_len:
                raise ValueError("解壓縮失敗：檔案損毀，字元位元組長度超出範圍")
                
            # 讀取下一個字元
            char_bytes = data[offset:offset+char_len]
            next_char = char_bytes.decode('utf-8')
            offset += char_len
            
            tokens.append((tok_offset, tok_length, next_char))
            
        metadata = {
            "window_size": win_size,
            "lookahead_buffer_size": lookahead_size,
            "token_count": token_count
        }
        
        return tokens, metadata
