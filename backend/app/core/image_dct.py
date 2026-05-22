import numpy as np
from PIL import Image
import io
import base64
import math
import os

# Precompute the 2D DCT transform matrix T of size 8x8
T = np.zeros((8, 8), dtype=np.float32)
for i in range(8):
    for j in range(8):
        if i == 0:
            T[i, j] = 1.0 / math.sqrt(8)
        else:
            T[i, j] = math.sqrt(2.0 / 8) * math.cos((2 * j + 1) * i * math.pi / 16.0)

# Standard JPEG Quantization Tables (Luminance QY & Chrominance QC)
QY = np.array([
    [16, 11, 10, 16, 24,  40,  51,  61],
    [12, 12, 14, 19, 26,  58,  60,  55],
    [14, 13, 16, 24, 40,  57,  69,  56],
    [14, 17, 22, 29, 51,  87,  80,  62],
    [18, 22, 37, 56, 68, 109, 103,  77],
    [24, 35, 55, 64, 81, 104, 113,  92],
    [49, 64, 78, 87, 103, 121, 120, 101],
    [72, 92, 95, 98, 112, 100, 103,  99]
], dtype=np.float32)

QC = np.array([
    [17, 18, 24, 47, 99, 99, 99, 99],
    [18, 21, 26, 66, 99, 99, 99, 99],
    [24, 26, 56, 99, 99, 99, 99, 99],
    [47, 66, 99, 99, 99, 99, 99, 99],
    [99, 99, 99, 99, 99, 99, 99, 99],
    [99, 99, 99, 99, 99, 99, 99, 99],
    [99, 99, 99, 99, 99, 99, 99, 99],
    [99, 99, 99, 99, 99, 99, 99, 99]
], dtype=np.float32)

# Zig-zag index list for 8x8 block
ZIGZAG_INDEX = [
    (0,0), (0,1), (1,0), (2,0), (1,1), (0,2), (0,3), (1,2),
    (2,1), (3,0), (4,0), (3,1), (2,2), (1,3), (0,4), (0,5),
    (1,4), (2,3), (3,2), (4,1), (5,0), (6,0), (5,1), (4,2),
    (3,3), (2,4), (1,5), (0,6), (0,7), (1,6), (2,5), (3,4),
    (4,3), (5,2), (6,1), (7,0), (7,1), (6,2), (5,3), (4,4),
    (3,5), (2,6), (1,7), (2,7), (3,6), (4,5), (5,4), (6,3),
    (7,2), (7,3), (6,4), (5,5), (4,6), (3,7), (4,7), (5,6),
    (6,5), (7,4), (7,5), (6,6), (5,7), (6,7), (7,6), (7,7)
]

def get_quantization_table(quality: int, is_chrominance: bool = False) -> np.ndarray:
    """Scales standard JPEG quantization tables according to quality factor (1-100)"""
    quality = max(1, min(100, int(quality)))
    if quality < 50:
        scale = 5000.0 / quality
    else:
        scale = 200.0 - 2.0 * quality
    
    base_table = QC if is_chrominance else QY
    scaled_table = np.floor((base_table * scale + 50.0) / 100.0)
    scaled_table = np.clip(scaled_table, 1, 255)
    return scaled_table.astype(np.float32)

def dct_2d(block: np.ndarray) -> np.ndarray:
    """Computes 2D DCT of an 8x8 block"""
    return np.dot(np.dot(T, block), T.T)

def idct_2d(block: np.ndarray) -> np.ndarray:
    """Computes 2D IDCT of an 8x8 block"""
    return np.dot(np.dot(T.T, block), T)

def estimate_compressed_size(original_bytes: int, quant_blocks_y, quant_blocks_cb=None, quant_blocks_cr=None) -> int:
    """Estimates JPEG file size based on quantized AC RLE runs and DC differences"""
    total_bits = 0
    all_channels = [quant_blocks_y]
    if quant_blocks_cb is not None:
        all_channels.append(quant_blocks_cb)
    if quant_blocks_cr is not None:
        all_channels.append(quant_blocks_cr)
        
    for channel_blocks in all_channels:
        num_blocks = len(channel_blocks)
        total_bits += num_blocks * 6  # ~6 bits for DC difference on average
        for block in channel_blocks:
            # Flatten in zig-zag order
            ac_coeffs = [block[r, c] for r, c in ZIGZAG_INDEX][1:]
            
            run = 0
            for val in ac_coeffs:
                if val == 0:
                    run += 1
                else:
                    # Non-zero coefficient: RLE prefix + amplitude category bits
                    category = math.ceil(math.log2(abs(val) + 1))
                    total_bits += 6 + category  # 6 bits average Huffman prefix + amplitude bits
                    run = 0
            if run > 0:
                total_bits += 4  # End of block (EOB) symbol
                
    # Add JPEG header overhead (around 600 bytes)
    estimated_bytes = int(math.ceil(total_bits / 8.0)) + 600
    
    # Ensure it's not larger than original, but realistic
    return min(original_bytes, max(1200, estimated_bytes))

def process_image_dct(image_path: str, quality: int, mode: str = "color"):
    """
    Compresses an image using 8x8 block DCT and Quantization.
    Returns: (base64_reconstructed, stats)
    """
    with Image.open(image_path) as img:
        # Convert to RGB if needed
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        orig_w, orig_h = img.size
        # Crop to multiples of 8
        w = orig_w - (orig_w % 8)
        h = orig_h - (orig_h % 8)
        if w < 8: w = 8
        if h < 8: h = 8
        
        img_cropped = img.crop((0, 0, w, h))
        img_arr = np.array(img_cropped, dtype=np.float32)
        
        # Original size in bytes
        original_bytes = os.path.getsize(image_path) if hasattr(os, 'path') and os.path.exists(image_path) else w * h * 3
        
        # Color space conversion
        r = img_arr[:, :, 0]
        g = img_arr[:, :, 1]
        b = img_arr[:, :, 2]
        
        y = 0.299 * r + 0.587 * g + 0.114 * b
        cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128.0
        cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128.0
        
        # Quantization tables
        q_table_y = get_quantization_table(quality, is_chrominance=False)
        q_table_c = get_quantization_table(quality, is_chrominance=True)
        
        # Storage for reconstructed channels
        y_rec = np.zeros_like(y)
        cb_rec = np.zeros_like(cb) if mode == "color" else np.full_like(cb, 128.0)
        cr_rec = np.zeros_like(cr) if mode == "color" else np.full_like(cr, 128.0)
        
        # Lists for size estimation
        quant_y_list = []
        quant_cb_list = []
        quant_cr_list = []
        
        total_coeffs = w * h
        zero_coeffs = 0
        
        # Process block-by-block
        for row in range(0, h, 8):
            for col in range(0, w, 8):
                # 1. Y Channel
                block_y = y[row:row+8, col:col+8] - 128.0
                dct_y = dct_2d(block_y)
                quant_y = np.round(dct_y / q_table_y)
                quant_y_list.append(quant_y)
                zero_coeffs += np.sum(quant_y == 0)
                
                dequant_y = quant_y * q_table_y
                y_rec[row:row+8, col:col+8] = idct_2d(dequant_y) + 128.0
                
                # Cb, Cr Channels (only processed if mode is color)
                if mode == "color":
                    block_cb = cb[row:row+8, col:col+8] - 128.0
                    dct_cb = dct_2d(block_cb)
                    quant_cb = np.round(dct_cb / q_table_c)
                    quant_cb_list.append(quant_cb)
                    zero_coeffs += np.sum(quant_cb == 0)
                    
                    dequant_cb = quant_cb * q_table_c
                    cb_rec[row:row+8, col:col+8] = idct_2d(dequant_cb) + 128.0
                    
                    block_cr = cr[row:row+8, col:col+8] - 128.0
                    dct_cr = dct_2d(block_cr)
                    quant_cr = np.round(dct_cr / q_table_c)
                    quant_cr_list.append(quant_cr)
                    zero_coeffs += np.sum(quant_cr == 0)
                    
                    dequant_cr = quant_cr * q_table_c
                    cr_rec[row:row+8, col:col+8] = idct_2d(dequant_cr) + 128.0
                    
        # Reconstruct RGB
        r_rec = y_rec + 1.402 * (cr_rec - 128.0)
        g_rec = y_rec - 0.34414 * (cb_rec - 128.0) - 0.71414 * (cr_rec - 128.0)
        b_rec = y_rec + 1.772 * (cb_rec - 128.0)
        
        img_rec = np.stack([r_rec, g_rec, b_rec], axis=-1)
        img_rec = np.clip(img_rec, 0, 255).astype(np.uint8)
        
        # Convert reconstructed image to PIL and base64
        rec_pil = Image.fromarray(img_rec)
        buffered = io.BytesIO()
        rec_pil.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        # Calculate statistics
        total_coeff_count = total_coeffs * (3 if mode == "color" else 1)
        zero_ratio = (zero_coeffs / total_coeff_count) * 100
        
        # PSNR Calculation
        mse = np.mean((img_arr - img_rec) ** 2)
        if mse == 0:
            psnr = 99.9
        else:
            psnr = 20 * math.log10(255.0 / math.sqrt(mse))
            psnr = round(psnr, 2)
            
        # Estimated size
        est_compressed_size = estimate_compressed_size(
            original_bytes,
            quant_y_list,
            quant_cb_list if mode == "color" else None,
            quant_cr_list if mode == "color" else None
        )
        
        compression_ratio = round(original_bytes / est_compressed_size, 2)
        
        stats = {
            "original_width": orig_w,
            "original_height": orig_h,
            "processed_width": w,
            "processed_height": h,
            "original_size": original_bytes,
            "compressed_size": est_compressed_size,
            "compression_ratio": compression_ratio,
            "zero_percentage": round(zero_ratio, 2),
            "psnr": psnr,
            "blocks_count": len(quant_y_list)
        }
        
        return f"data:image/png;base64,{img_str}", stats

def get_block_matrices(image_path: str, quality: int, mode: str, block_row: int, block_col: int):
    """
    Extracts Y-channel matrices for a specific block.
    """
    with Image.open(image_path) as img:
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        w, h = img.size
        # Make sure row and col are valid
        row_start = int(block_row) * 8
        col_start = int(block_col) * 8
        
        if row_start + 8 > h or col_start + 8 > w:
            raise ValueError("Invalid block coordinates")
            
        img_cropped = img.crop((col_start, row_start, col_start + 8, row_start + 8))
        img_arr = np.array(img_cropped, dtype=np.float32)
        
        r = img_arr[:, :, 0]
        g = img_arr[:, :, 1]
        b = img_arr[:, :, 2]
        
        # Y channel
        y = 0.299 * r + 0.587 * g + 0.114 * b
        
        q_table_y = get_quantization_table(quality, is_chrominance=False)
        
        original_block = y.copy()
        
        # Shift level (subtract 128)
        shifted_block = original_block - 128.0
        
        # DCT
        dct_block = dct_2d(shifted_block)
        
        # Quantize
        quantized_block = np.round(dct_block / q_table_y)
        
        # Dequantize
        dequantized_block = quantized_block * q_table_y
        
        # IDCT
        idct_block = idct_2d(dequantized_block)
        
        # Shift back
        reconstructed_block = np.clip(idct_block + 128.0, 0, 255)
        
        # Zig-zag sequence
        zigzag_seq = [int(quantized_block[r, c]) for r, c in ZIGZAG_INDEX]
        
        # Convert numpy structures to python lists
        return {
            "original_block": np.round(original_block).astype(int).tolist(),
            "dct_block": np.round(dct_block, 2).tolist(),
            "quantization_table": q_table_y.astype(int).tolist(),
            "quantized_block": quantized_block.astype(int).tolist(),
            "zigzag_sequence": zigzag_seq,
            "dequantized_block": np.round(dequantized_block, 2).tolist(),
            "reconstructed_block": np.round(reconstructed_block).astype(int).tolist()
        }
