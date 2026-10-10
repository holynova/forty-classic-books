# -*- coding: utf-8 -*-
"""
Merge audited 4-star books (batches 1-4) into data/books.json and update data/site.json.
Performs thorough schema and content validation.
"""

import json
import os
import sys

BASE_DIR = '/Users/sym/Code/forty-classic-books'
DATA_DIR = os.path.join(BASE_DIR, 'data')
BOOKS_PATH = os.path.join(DATA_DIR, 'books.json')
SITE_PATH = os.path.join(DATA_DIR, 'site.json')

batch_files = [
    os.path.join(DATA_DIR, 'audited_4star_batch_1.json'),
    os.path.join(DATA_DIR, 'audited_4star_batch_2.json'),
    os.path.join(DATA_DIR, 'audited_4star_batch_3.json'),
    os.path.join(DATA_DIR, 'audited_4star_batch_4.json')
]

# Check if all files exist
missing = [f for f in batch_files if not os.path.exists(f)]
if missing:
    print(f"Waiting for files: {[os.path.basename(f) for f in missing]}")
    sys.exit(1)

# Load existing 112 books
with open(BOOKS_PATH, 'r', encoding='utf-8') as f:
    raw_books = json.load(f)
existing_books = [b for b in raw_books if b.get('id', 0) < 171]

# Load all 4-star audited books
new_books = []
for bf in batch_files:
    with open(bf, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Loaded {len(data)} books from {os.path.basename(bf)}")
    new_books.extend(data)

print(f"\nExisting books: {len(existing_books)}")
print(f"New 4-star books: {len(new_books)}")

# Normalize domainOrder for Domain 9 (主理人四星精选)
for idx, b in enumerate(new_books, start=1):
    b['domain'] = "主理人四星精选"
    b['domainOrder'] = f"第 {idx:02d} 本"

# Comprehensive validation
all_books = existing_books + new_books
errors = []
covers_dir = os.path.join(BASE_DIR, 'covers')
required_fields = ['id', 'slug', 'title', 'domain', 'domainOrder', 'author', 'publisher', 'publishYear', 'intro', 'thesis', 'ideas', 'structure']

id_seen = set()
for b in all_books:
    bid = b.get('id')
    if bid in id_seen:
        errors.append(f"Duplicate book ID {bid}")
    id_seen.add(bid)

    for rf in required_fields:
        if rf not in b or not b[rf]:
            errors.append(f"Book {bid} missing field {rf}")

    # Check thesis
    if not isinstance(b['thesis'], list) or len(b['thesis']) < 2:
        errors.append(f"Book {bid} thesis must be list of >= 2 items (has {len(b.get('thesis', []))})")

    # Check ideas
    if not isinstance(b['ideas'], list) or len(b['ideas']) < 5:
        errors.append(f"Book {bid} ideas must be list of >= 5 items (has {len(b.get('ideas', []))})")
    else:
        for idea in b['ideas']:
            for k in ['num', 'title', 'desc', 'example']:
                if k not in idea or not str(idea[k]).strip():
                    errors.append(f"Book {bid} idea missing {k}")

    # Check structure
    if not isinstance(b['structure'], list) or len(b['structure']) < 2:
        errors.append(f"Book {bid} structure must be list of >= 2 items (has {len(b.get('structure', []))})")
    else:
        for st in b['structure']:
            for k in ['num', 'title', 'desc', 'example']:
                if k not in st or not str(st[k]).strip():
                    errors.append(f"Book {bid} structure missing {k}")

    # Check cover
    cover_filename = b.get('cover')
    if not cover_filename:
        errors.append(f"Book {bid} missing cover filename")
    else:
        cover_base = os.path.splitext(os.path.basename(cover_filename))[0]
        thumb_path = os.path.join(covers_dir, 'thumbs', f"{cover_base}.webp")
        detail_path = os.path.join(covers_dir, 'detail', f"{cover_base}.webp")
        if not os.path.exists(thumb_path):
            errors.append(f"Book {bid} missing thumb WebP: {thumb_path}")
        if not os.path.exists(detail_path):
            errors.append(f"Book {bid} missing detail WebP: {detail_path}")

if errors:
    print(f"\nVALIDATION FAILED with {len(errors)} errors:")
    for err in errors[:20]:
        print(f"  - {err}")
    if len(errors) > 20:
        print(f"  ... and {len(errors) - 20} more errors.")
    sys.exit(1)

print("\nALL 192 BOOKS PASSED STRICT VALIDATION!")

# Write updated books.json
with open(BOOKS_PATH, 'w', encoding='utf-8') as f:
    json.dump(all_books, f, ensure_ascii=False, indent=2)
print(f"Successfully wrote {len(all_books)} books to {BOOKS_PATH}")

# Update site.json
with open(SITE_PATH, 'r', encoding='utf-8') as f:
    site_data = json.load(f)

# Ensure dom-9 exists
dom9_exists = any(d['id'] == 'dom-9' for d in site_data['domains'])
if not dom9_exists:
    site_data['domains'].append({
        "id": "dom-9",
        "name": "主理人四星精选",
        "slug": "curator-four-stars",
        "count": "80 本",
        "intro": "主理人豆瓣个人书架标记为4星的高价值书目精选，覆盖架构工程、交互设计、心理认知、商业社会、空间建筑与纪实人文等领域。"
    })
else:
    for d in site_data['domains']:
        if d['id'] == 'dom-9':
            d['count'] = "80 本"

site_data['title'] = f"经典书导读 · {len(site_data['domains'])} 大领域 · {len(all_books)} 本严选精读指南"
site_data['brandSub'] = f"CLASSIC BOOKS · {len(all_books)} MASTERPIECES"
site_data['heroTag'] = f"{len(site_data['domains'])} 大领域 · {len(all_books)} 本严选 · 章节对齐豆瓣原目录"
site_data['heroDesc'] = "软件工程 · 系统设计 · UI/UX · 产品经理 · 中国历史 · 建筑学 · 艺术 · 主理人五星 · 主理人四星。每本书章节结构严格对齐原书目录，拒绝空话杜撰。"

with open(SITE_PATH, 'w', encoding='utf-8') as f:
    json.dump(site_data, f, ensure_ascii=False, indent=2)
print(f"Successfully updated site.json (totalBooks: {len(all_books)}, totalDomains: {len(site_data['domains'])})")
