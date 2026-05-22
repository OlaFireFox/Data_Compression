"""
Huffman 壓縮演算法核心實現
"""
import heapq
from typing import Dict, List, Tuple, Optional
from collections import Counter
import json


class Node:
    """Huffman Tree 的節點"""
    def __init__(self, char: Optional[str] = None, freq: int = 0, left=None, right=None, node_id: Optional[int] = None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right
        self.node_id = node_id  # 用於追蹤節點的唯一識別碼

    def __lt__(self, other):
        """用於優先級隊列的比較"""
        if self.freq != other.freq:
            return self.freq < other.freq
        # 如果頻率相同，按照 node_id 比較（保證穩定性）
        return (self.node_id or 0) < (other.node_id or 0)

    def __repr__(self):
        if self.char:
            return f"Node('{self.char}', freq={self.freq})"
        return f"Node(internal, freq={self.freq})"


class HuffmanCoder:
    """Huffman 編碼器 - 提供壓縮和解壓縮功能"""
    
    def __init__(self):
        self.root = None
        self.codes = {}
        self.reverse_codes = {}
        self.build_steps = []  # 記錄構建過程
        self.node_counter = 0  # 節點計數器
    
    def calculate_frequencies(self, text: str) -> Dict[str, int]:
        """計算文本中各個字符的頻率"""
        return dict(Counter(text))
    
    def build_huffman_tree(self, frequencies: Dict[str, int]) -> None:
        """構建 Huffman Tree 並記錄過程"""
        if not frequencies:
            raise ValueError("頻率字典不能為空")
        
        self.build_steps = []
        self.node_counter = 0
        
        # 初始化優先隊列，每個字符一個節點
        heap = []
        for char, freq in frequencies.items():
            node = Node(char=char, freq=freq, node_id=self.node_counter)
            heapq.heappush(heap, node)
            self.node_counter += 1
        
        # 構建 Huffman Tree
        while len(heap) > 1:
            # 取出兩個最小頻率的節點
            left = heapq.heappop(heap)
            right = heapq.heappop(heap)
            
            # 創建新的父節點
            merged_freq = left.freq + right.freq
            parent = Node(freq=merged_freq, left=left, right=right, node_id=self.node_counter)
            self.node_counter += 1
            
            # 記錄這一步的合併過程
            step = {
                "step": len(self.build_steps) + 1,
                "left_node": {
                    "char": left.char,
                    "freq": left.freq,
                    "node_id": left.node_id,
                    "is_leaf": left.char is not None
                },
                "right_node": {
                    "char": right.char,
                    "freq": right.freq,
                    "node_id": right.node_id,
                    "is_leaf": right.char is not None
                },
                "parent_node": {
                    "freq": merged_freq,
                    "node_id": parent.node_id,
                    "is_leaf": False
                }
            }
            self.build_steps.append(step)
            
            # 將新節點加入隊列
            heapq.heappush(heap, parent)
        
        # 根節點
        self.root = heap[0]
    
    def generate_codes(self) -> Dict[str, str]:
        """從 Huffman Tree 生成編碼表"""
        self.codes = {}
        self._traverse_tree(self.root, "")
        return self.codes
    
    def _traverse_tree(self, node: Node, code: str) -> None:
        """遍歷樹並生成編碼"""
        if node is None:
            return
        
        # 葉節點 - 字符節點
        if node.char is not None:
            self.codes[node.char] = code if code else "0"
            self.reverse_codes[code if code else "0"] = node.char
            return
        
        # 非葉節點 - 繼續遍歷
        if node.left:
            self._traverse_tree(node.left, code + "0")
        if node.right:
            self._traverse_tree(node.right, code + "1")
    
    def encode(self, text: str) -> str:
        """編碼文本"""
        if not self.codes:
            raise ValueError("編碼表未生成，請先調用 generate_codes()")
        
        try:
            return "".join(self.codes[char] for char in text)
        except KeyError as e:
            raise ValueError(f"字符 {e} 不在編碼表中")
    
    def decode(self, encoded_text: str) -> str:
        """解碼文本"""
        if not self.reverse_codes:
            raise ValueError("反向編碼表未生成，請先調用 generate_codes()")
        
        decoded_chars = []
        current_code = ""
        for bit in encoded_text:
            current_code += bit
            if current_code in self.reverse_codes:
                decoded_chars.append(self.reverse_codes[current_code])
                current_code = ""
        
        if current_code:
            raise ValueError(f"無效的編碼：剩餘位數 '{current_code}'")
        
        return "".join(decoded_chars)
    
    def compress(self, text: str) -> Tuple[str, Dict]:
        """完整的壓縮過程"""
        # 計算頻率
        frequencies = self.calculate_frequencies(text)
        
        # 構建 Huffman Tree
        self.build_huffman_tree(frequencies)
        
        # 生成編碼表
        self.generate_codes()
        
        # 編碼文本
        encoded = self.encode(text)
        
        # 返回編碼結果和元數據
        return encoded, {
            "frequencies": frequencies,
            "code_table": self.codes,
            "build_steps": self.build_steps,
            "original_size": len(text),
            "encoded_size": len(encoded),
            "compression_ratio": round((1 - len(encoded) / (len(text) * 8)) * 100, 2)
        }
    
    def decompress(self, encoded_text: str) -> str:
        """解壓縮"""
        return self.decode(encoded_text)
    
    def get_tree_structure(self) -> Optional[Dict]:
        """獲取 Huffman Tree 的結構（用於前端視覺化）"""
        if not self.root:
            return None
        
        return self._serialize_tree(self.root)
    
    def _serialize_tree(self, node: Node) -> Dict:
        """序列化樹節點"""
        if node is None:
            return None
        
        result = {
            "freq": node.freq,
            "node_id": node.node_id,
            "is_leaf": node.char is not None
        }
        
        if node.char is not None:
            result["char"] = node.char
        
        if node.left:
            result["left"] = self._serialize_tree(node.left)
        if node.right:
            result["right"] = self._serialize_tree(node.right)
        
        return result
