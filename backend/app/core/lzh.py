"""
LZH (LZ77 + Huffman) 聯動壓縮演算法核心實現
"""
import heapq
import struct
from collections import Counter
from typing import Dict, List, Tuple, Optional, Any

from app.core.lz77 import LZ77Coder


class ByteNode:
    """字節級霍夫曼樹節點"""
    def __init__(self, byte_val: Optional[int] = None, freq: int = 0, left=None, right=None, node_id: int = 0):
        self.byte_val = byte_val
        self.freq = freq
        self.left = left
        self.right = right
        self.node_id = node_id

    def __lt__(self, other):
        if self.freq != other.freq:
            return self.freq < other.freq
        return self.node_id < other.node_id

    def is_leaf(self) -> bool:
        return self.byte_val is not None


class ByteHuffmanCoder:
    """字節級霍夫曼編碼器，對位元組陣列 (bytes) 進行霍夫曼編碼"""

    def __init__(self):
        self.root = None
        self.codes = {}
        self.reverse_codes = {}
        self.node_counter = 0

    def build_tree(self, frequencies: Dict[int, int]) -> None:
        self.node_counter = 0
        heap = []
        
        for byte_val, freq in frequencies.items():
            node = ByteNode(byte_val=byte_val, freq=freq, node_id=self.node_counter)
            heapq.heappush(heap, node)
            self.node_counter += 1

        if not heap:
            return

        while len(heap) > 1:
            left = heapq.heappop(heap)
            right = heapq.heappop(heap)
            
            merged_freq = left.freq + right.freq
            parent = ByteNode(freq=merged_freq, left=left, right=right, node_id=self.node_counter)
            self.node_counter += 1
            
            heapq.heappush(heap, parent)

        self.root = heap[0]

    def generate_codes(self) -> None:
        self.codes = {}
        self.reverse_codes = {}
        if self.root:
            self._traverse(self.root, "")

    def _traverse(self, node: ByteNode, code: str) -> None:
        if node.is_leaf():
            # 單一節點防呆
            final_code = code if code else "0"
            self.codes[node.byte_val] = final_code
            self.reverse_codes[final_code] = node.byte_val
            return
            
        if node.left:
            self._traverse(node.left, code + "0")
        if node.right:
            self._traverse(node.right, code + "1")

    def encode(self, data: bytes) -> Tuple[bytes, int]:
        """將位元組陣列編碼成二進位 bitstream 及其 bit 長度"""
        if not data:
            return b"", 0
            
        bit_str_list = []
        for byte in data:
            bit_str_list.append(self.codes[byte])
        bit_str = "".join(bit_str_list)
        
        bit_count = len(bit_str)
        
        # 將 bit 字串打包成 bytes
        byte_list = bytearray()
        for i in range(0, bit_count, 8):
            byte_chunk = bit_str[i:i+8]
            if len(byte_chunk) < 8:
                # 填充 0
                byte_chunk = byte_chunk.ljust(8, '0')
            byte_list.append(int(byte_chunk, 2))
            
        return bytes(byte_list), bit_count

    def decode(self, bitstream: bytes, bit_count: int) -> bytes:
        """根據 bitstream 與位元長度還原為 bytes"""
        if bit_count == 0 or not self.root:
            return b""
            
        # 將 bytes 轉回 bit 字串
        bit_str_list = []
        for byte in bitstream:
            bit_str_list.append(bin(byte)[2:].zfill(8))
        bit_str = "".join(bit_str_list)[:bit_count]
        
        decoded_bytes = bytearray()
        curr_node = self.root
        
        for bit in bit_str:
            if bit == '0':
                curr_node = curr_node.left
            else:
                curr_node = curr_node.right
                
            if curr_node.is_leaf():
                decoded_bytes.append(curr_node.byte_val)
                curr_node = self.root
                
        return bytes(decoded_bytes)

    def get_tree_structure(self) -> Optional[Dict]:
        """獲取樹結構（供前端 JSON 視覺化）"""
        if not self.root:
            return None
        return self._serialize_node(self.root)

    def _serialize_node(self, node: ByteNode) -> Dict:
        result = {
            "freq": node.freq,
            "node_id": node.node_id,
            "is_leaf": node.is_leaf()
        }
        if node.is_leaf():
            # 在 JSON 中我們將 Byte 值轉為易讀文字或 16 進位顯示
            result["byte_val"] = node.byte_val
            # 方便前端顯示
            if 32 <= node.byte_val <= 126:
                result["char"] = chr(node.byte_val)
            else:
                result["char"] = f"0x{node.byte_val:02X}"
        else:
            if node.left:
                result["left"] = self._serialize_node(node.left)
            if node.right:
                result["right"] = self._serialize_node(node.right)
        return result


class LHZCoder:
    """
    LZH 聯動編碼器與解碼器。
    整合 LZ77 演算法與字節級霍夫曼編碼（類似 DEFLATE）。
    """
    def __init__(self, window_size: int = 1024, lookahead_buffer_size: int = 32):
        self.lz77_coder = LZ77Coder(window_size, lookahead_buffer_size)
        self.last_lz77_bytes = b""

    def compress(self, text: str, max_vis_chars: int = 200) -> Tuple[bytes, Dict[str, Any], List[Dict[str, Any]], Optional[Dict]]:
        """
        執行 LZH 聯動壓縮。
        
        流程:
          1. 執行 LZ77 壓縮得到 tokens 序列。
          2. 將 tokens 序列化為位元組陣列 lz77_bytes。
          3. 對 lz77_bytes 執行霍夫曼編碼得到最終的 LZH 位元組。
        """
        # Step 1: LZ77 壓縮與序列化
        tokens, lz77_steps, lz77_stats = self.lz77_coder.compress(text, max_vis_chars)
        lz77_bytes = self.lz77_coder.serialize(tokens)
        self.last_lz77_bytes = lz77_bytes
        
        # Step 2: 霍夫曼編碼
        frequencies = dict(Counter(lz77_bytes))
        huff_coder = ByteHuffmanCoder()
        huff_coder.build_tree(frequencies)
        huff_coder.generate_codes()
        
        huffman_bitstream, bit_count = huff_coder.encode(lz77_bytes)
        
        # Step 3: 打包成自訂 .lzh 檔案格式
        # 格式設計:
        #   - 標頭:
        #       - 4 bytes: Signature (b"LZH ")
        #       - 2 bytes: num_symbols (unsigned short)
        #   - 頻率表 (為還原樹使用):
        #       - num_symbols * (1 byte symbol + 4 bytes frequency)
        #   - 壓縮主體:
        #       - 4 bytes: bit_count (unsigned int)
        #       - N bytes: huffman_bitstream
        
        num_symbols = len(frequencies)
        header = struct.pack(">4sH", b"LZH ", num_symbols)
        
        freq_table_bytes = bytearray()
        for symbol, freq in frequencies.items():
            freq_table_bytes.extend(struct.pack(">BI", symbol, freq))
            
        body = struct.pack(">I", bit_count) + huffman_bitstream
        lzh_data = header + bytes(freq_table_bytes) + body
        
        # Step 4: 統計指標與樹結構
        original_size = len(text.encode('utf-8'))
        lzh_size = len(lzh_data)
        
        compression_ratio = round(original_size / lzh_size, 2) if lzh_size > 0 else 0
        space_saving = round((1 - lzh_size / original_size) * 100, 2) if original_size > 0 else 0
        
        # 將 code_table 轉為字串形式方便傳遞給前端
        huffman_code_table = {f"0x{k:02X}": v for k, v in huff_coder.codes.items()}
        
        stats = {
            "original_size": original_size,
            "lz77_size": len(lz77_bytes),
            "lzh_size": lzh_size,
            "compression_ratio": compression_ratio,
            "space_saving": space_saving,
            "huffman_unique_symbols": num_symbols,
            "huffman_bit_count": bit_count
        }
        
        tree_structure = huff_coder.get_tree_structure()
        
        return lzh_data, stats, lz77_steps, tree_structure, huffman_code_table

    def decompress(self, lzh_data: bytes) -> str:
        """
        執行 LZH 聯動解壓縮。
        """
        if len(lzh_data) < 6:
            raise ValueError("無效的資料：檔案長度小於標頭長度")
            
        # 解讀標頭
        sig, num_symbols = struct.unpack(">4sH", lzh_data[:6])
        if sig != b"LZH ":
            raise ValueError("無效的 LZH 檔案格式簽名")
            
        offset = 6
        data_len = len(lzh_data)
        
        # 讀取頻率表
        frequencies = {}
        for _ in range(num_symbols):
            if offset + 5 > data_len:
                raise ValueError("解壓縮失敗：頻率表毀損或截斷")
            symbol, freq = struct.unpack(">BI", lzh_data[offset:offset+5])
            frequencies[symbol] = freq
            offset += 5
            
        # 讀取 bit 數與 bitstream
        if offset + 4 > data_len:
            raise ValueError("解壓縮失敗：檔案本體毀損")
        bit_count, = struct.unpack(">I", lzh_data[offset:offset+4])
        offset += 4
        
        bitstream = lzh_data[offset:]
        
        # 重建霍夫曼樹並解碼
        huff_coder = ByteHuffmanCoder()
        huff_coder.build_tree(frequencies)
        huff_coder.generate_codes()
        
        lz77_bytes = huff_coder.decode(bitstream, bit_count)
        
        # 反序列化 LZ77 標記並還原文字
        tokens, _ = self.lz77_coder.deserialize(lz77_bytes)
        original_text = self.lz77_coder.decompress(tokens)
        
        return original_text
