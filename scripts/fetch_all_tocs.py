#!/usr/bin/env python3
"""
Fetch official table of contents (TOC) and intros for all 170 books from Douban.
Save ground truth to data/ground_truth_tocs.json.
"""

import json
import os
import re
import subprocess
import time
import urllib.parse

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
BOOKS_PATH = os.path.join(DATA_DIR, 'books.json')
OUTPUT_PATH = os.path.join(DATA_DIR, 'ground_truth_tocs.json')
COOKIE_PATH = '/tmp/douban_cookie.txt'

with open(BOOKS_PATH, 'r', encoding='utf-8') as f:
    books = json.load(f)

# Load existing progress if any
results = {}
if os.path.exists(OUTPUT_PATH):
    try:
        with open(OUTPUT_PATH, 'r', encoding='utf-8') as f:
            results = json.load(f)
    except Exception:
        results = {}

print(f"Loaded {len(books)} books. Existing verified TOCs: {len(results)}")

def clean_html(raw_html):
    if not raw_html:
        return ""
    text = re.sub(r'<br\s*/?>', '\n', raw_html)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'<[^>]+>', '', text)
    return text.strip()

for idx, b in enumerate(books):
    bid = str(b['id'])
    if bid in results and results[bid].get('toc') and len(results[bid]['toc']) > 0:
        continue

    url = b['doubanUrl']
    print(f"[{idx+1}/{len(books)}] Fetching Douban for Book {b['id']}: {b['title']}...")

    cmd = [
        'curl', '-s',
        '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ]
    if os.path.exists(COOKIE_PATH):
        cmd.extend(['-b', COOKIE_PATH])
    cmd.append(url)

    res = subprocess.run(cmd, capture_output=True, text=True)
    html = res.stdout

    # 1. Extract TOC (目录)
    # Check for dir_<id>_full, then dir_<id>_short, or general dir block
    toc_match = re.search(r'id=\"dir_\d+_full\"[^>]*>(.*?)</div>', html, re.S)
    if not toc_match:
        toc_match = re.search(r'id=\"dir_\d+_short\"[^>]*>(.*?)</div>', html, re.S)
    if not toc_match:
        toc_match = re.search(r'<h2>\s*<span class=\"\">目录</span>.*?<div class=\"indent\"[^>]*>(.*?)</div>', html, re.S)

    toc_lines = []
    if toc_match:
        raw_toc = toc_match.group(1)
        raw_text = clean_html(raw_toc)
        for line in raw_text.split('\n'):
            line = line.strip()
            if not line:
                continue
            if line.startswith('· · ·') or line.startswith('(收起)') or line.startswith('(更多)'):
                continue
            toc_lines.append(line)

    # 2. Extract intro (内容简介)
    intro_match = re.search(r'id=\"link-report\"[^>]*>(.*?)</div>\s*</div>', html, re.S)
    if not intro_match:
        intro_match = re.search(r'<div class=\"intro\">.*?<p>(.*?)</p>', html, re.S)
    
    intro_text = ""
    if intro_match:
        intro_text = clean_html(intro_match.group(1))

    results[bid] = {
        'id': b['id'],
        'title': b['title'],
        'domain': b['domain'],
        'author': b['author'],
        'doubanUrl': b['doubanUrl'],
        'has_toc': len(toc_lines) > 0,
        'toc_lines_count': len(toc_lines),
        'toc': toc_lines,
        'official_intro': intro_text[:2000]
    }

    # Save incremental progress
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    time.sleep(0.1)

has_toc_count = sum(1 for v in results.values() if v.get('has_toc'))
print(f"\nDone! Out of {len(books)} books, {has_toc_count} have official TOC directly from Douban.")
print(f"Saved to {OUTPUT_PATH}")
