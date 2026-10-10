#!/usr/bin/env python3
"""
HN Image Loading Optimizer: Generate optimized WebP thumbnails and detail images for all covers.
- covers/thumbs/*.webp (max 140x210, quality 82) for index list rows and prev/next links
- covers/detail/*.webp (max 320x480, quality 85) for detail pages
- keeps original covers/*.jpg for high-res fallback
"""

import os
import sys
from PIL import Image

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS_DIR = os.path.join(ROOT_DIR, 'covers')
THUMBS_DIR = os.path.join(COVERS_DIR, 'thumbs')
DETAIL_DIR = os.path.join(COVERS_DIR, 'detail')

os.makedirs(THUMBS_DIR, exist_ok=True)
os.makedirs(DETAIL_DIR, exist_ok=True)

image_files = [
    f for f in os.listdir(COVERS_DIR)
    if os.path.isfile(os.path.join(COVERS_DIR, f)) and f.lower().endswith(('.jpg', '.jpeg', '.png'))
]

print(f"Found {len(image_files)} original cover images.")

total_orig_bytes = 0
total_thumb_bytes = 0
total_detail_bytes = 0

for idx, fname in enumerate(sorted(image_files)):
    src_path = os.path.join(COVERS_DIR, fname)
    base_name = os.path.splitext(fname)[0]
    thumb_path = os.path.join(THUMBS_DIR, f"{base_name}.webp")
    detail_path = os.path.join(DETAIL_DIR, f"{base_name}.webp")

    orig_size = os.path.getsize(src_path)
    total_orig_bytes += orig_size

    with Image.open(src_path) as im:
        if im.mode not in ('RGB', 'L'):
            im = im.convert('RGB')
        
        # 1. Thumbnail (for 68px width @ 2x DPR -> 140px)
        thumb = im.copy()
        thumb.thumbnail((140, 210), Image.Resampling.LANCZOS)
        thumb.save(thumb_path, 'WEBP', quality=82, method=6)
        total_thumb_bytes += os.path.getsize(thumb_path)

        # 2. Detail cover (for 138-168px width @ 2x DPR -> 320px)
        detail = im.copy()
        detail.thumbnail((320, 480), Image.Resampling.LANCZOS)
        detail.save(detail_path, 'WEBP', quality=85, method=6)
        total_detail_bytes += os.path.getsize(detail_path)

print("\n--- Image Optimization Results ---")
print(f"Originals total:   {total_orig_bytes / 1024 / 1024:.2f} MB")
print(f"Thumbnails total:  {total_thumb_bytes / 1024 / 1024:.2f} MB (savings: {(1 - total_thumb_bytes / total_orig_bytes) * 100:.1f}%)")
print(f"Details total:     {total_detail_bytes / 1024 / 1024:.2f} MB (savings: {(1 - total_detail_bytes / total_orig_bytes) * 100:.1f}%)")
print(f"Successfully generated WebP thumbnails & detail images for {len(image_files)} books.\n")
