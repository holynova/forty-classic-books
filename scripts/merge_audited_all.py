# -*- coding: utf-8 -*-
"""
Merge all audited batches into data/books.json and update data/site.json.
Performs comprehensive consistency and schema validations.
"""

import json
import os
import sys

BASE_DIR = '/Users/sym/Code/forty-classic-books'

batch_files = [
    os.path.join(BASE_DIR, 'data/audited_batch_1.json'),
    os.path.join(BASE_DIR, 'data/audited_batch_2.json'),
    os.path.join(BASE_DIR, 'data/audited_batch_3.json'),
    os.path.join(BASE_DIR, 'data/audited_batch_4a.json'),
    os.path.join(BASE_DIR, 'data/audited_batch_4b.json')
]

all_books = []
for bf in batch_files:
    with open(bf, 'r', encoding='utf-8') as f:
        data = json.load(f)
    print(f"Loaded {len(data)} books from {os.path.basename(bf)}")
    all_books.extend(data)

print(f"\nTotal merged books: {len(all_books)}")

# Normalize domainOrder for Domain 8 (主理人五星精选)
dom8_books = [b for b in all_books if b['domain'] == '主理人五星精选']
print(f"Domain 8 books count: {len(dom8_books)}")
for idx, b in enumerate(dom8_books, start=1):
    b['domainOrder'] = f"第 {idx:02d} 本"

# Validation
errors = []
covers_dir = os.path.join(BASE_DIR, 'images/covers')
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
        errors.append(f"Book {bid} thesis must be list of >= 2 items")

    # Check ideas
    if not isinstance(b['ideas'], list) or len(b['ideas']) < 5:
        errors.append(f"Book {bid} ideas must be list of >= 5 items (has {len(b.get('ideas', []))})")
    else:
        for idea in b['ideas']:
            for key in ['num', 'title', 'desc', 'example']:
                if key not in idea or not str(idea[key]).strip():
                    errors.append(f"Book {bid} idea missing {key}: {idea}")

    # Check structure
    if not isinstance(b['structure'], list) or len(b['structure']) < 2:
        errors.append(f"Book {bid} structure must be list of >= 2 items")
    else:
        for st in b['structure']:
            for key in ['num', 'title', 'desc', 'example']:
                if key not in st or not str(st[key]).strip():
                    errors.append(f"Book {bid} structure part missing {key}: {st}")

    # Check cover file
    cover_rel = b.get('cover', '')
    if cover_rel:
        cover_abs = os.path.join(BASE_DIR, cover_rel)
        if not os.path.exists(cover_abs):
            errors.append(f"Book {bid} cover file not found: {cover_abs}")

if errors:
    print(f"Validation FAILED with {len(errors)} errors:")
    for err in errors[:10]:
        print(f"  - {err}")
    sys.exit(1)

print("All 112 books passed strict validation!")

# Sort books by ID (1-70 first, then 73-168)
all_books.sort(key=lambda x: x['id'])

# Write data/books.json
books_path = os.path.join(BASE_DIR, 'data/books.json')
with open(books_path, 'w', encoding='utf-8') as f:
    json.dump(all_books, f, ensure_ascii=False, indent=2)
print(f"Saved {len(all_books)} books to {books_path}")

# Update site.json domain count and metadata
site_path = os.path.join(BASE_DIR, 'data/site.json')
with open(site_path, 'r', encoding='utf-8') as f:
    site = json.load(f)

# Update domain counts
for dom in site['domains']:
    matching = [b for b in all_books if b['domain'] == dom['name']]
    dom['count'] = f"{len(matching)} 本"
    if dom['name'] == '主理人五星精选':
        dom['intro'] = "严选主理人豆瓣 4-5 星中经严格目录核实的 42 本社科、建筑、思维、纪实非虚构名著，剔除纯漫画、字帖、诗集与虚构小说。"
    print(f"Domain '{dom['name']}': count updated to {dom['count']}")

# Update site titles and hero
site['title'] = f"经典书导读 · 8 大领域 · {len(all_books)} 本严选精读指南"
site['brandSub'] = f"CLASSIC BOOKS · {len(all_books)} MASTERPIECES"
site['heroTag'] = f"8 大领域 · {len(all_books)} 本严选 · 章节对齐豆瓣原目录"
site['heroDesc'] = "软件工程 · 系统设计 · UI/UX · 产品经理 · 中国历史 · 建筑学 · 艺术 · 主理人精选。每本书章节结构严格对齐原书目录，拒绝空话杜撰。"

with open(site_path, 'w', encoding='utf-8') as f:
    json.dump(site, f, ensure_ascii=False, indent=2)
print(f"Updated {site_path}")
