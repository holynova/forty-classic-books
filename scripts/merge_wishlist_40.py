# -*- coding: utf-8 -*-
"""
Assemble, validate, and merge the 40 audited Wishlist books (251-290)
into data/books.json and update data/site.json.
"""

import json
import os
import sys
import importlib.util

BASE_DIR = '/Users/sym/Code/forty-classic-books'
DATA_DIR = os.path.join(BASE_DIR, 'data')
BOOKS_PATH = os.path.join(DATA_DIR, 'books.json')
SITE_PATH = os.path.join(DATA_DIR, 'site.json')
COVERS_DIR = os.path.join(BASE_DIR, 'covers')

# Load all 8 groups
all_wishlist_books = []
for g in range(1, 9):
    mod_name = f'audit_wish_group{g}'
    spec = importlib.util.spec_from_file_location(mod_name, os.path.join(BASE_DIR, 'scripts', f'{mod_name}.py'))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    var_name = f'books_group{g}'
    books = getattr(mod, var_name)
    print(f"Loaded Group {g}: {len(books)} books")
    all_wishlist_books.extend(books)

print(f"\nTotal Wishlist books loaded: {len(all_wishlist_books)}")
assert len(all_wishlist_books) == 40, f"Expected 40 books, got {len(all_wishlist_books)}"

# Normalize domain & domainOrder
for idx, b in enumerate(all_wishlist_books, start=1):
    b['domain'] = "主理人心愿精选"
    b['domainOrder'] = f"第 {idx:02d} 本"

# Validation
errors = []
required_fields = ['id', 'slug', 'title', 'domain', 'domainOrder', 'author', 'publisher', 'publishYear', 'intro', 'thesis', 'ideas', 'structure', 'cover']

id_seen = set()
for b in all_wishlist_books:
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

    # Check covers
    cover_filename = b.get('cover')
    if not cover_filename:
        errors.append(f"Book {bid} missing cover")
    else:
        cover_base = os.path.splitext(os.path.basename(cover_filename))[0]
        thumb_path = os.path.join(COVERS_DIR, 'thumbs', f"{cover_base}.webp")
        detail_path = os.path.join(COVERS_DIR, 'detail', f"{cover_base}.webp")
        if not os.path.exists(thumb_path):
            errors.append(f"Book {bid} missing thumb WebP: {thumb_path}")
        if not os.path.exists(detail_path):
            errors.append(f"Book {bid} missing detail WebP: {detail_path}")

if errors:
    print(f"\nVALIDATION FAILED with {len(errors)} errors:")
    for err in errors[:20]:
        print(f"  - {err}")
    sys.exit(1)

print("\nALL 40 WISHLIST BOOKS PASSED STRICT VALIDATION!")

# Save to data/audited_wishlist_40.json
with open(os.path.join(DATA_DIR, 'audited_wishlist_40.json'), 'w', encoding='utf-8') as f:
    json.dump(all_wishlist_books, f, ensure_ascii=False, indent=2)

# Load existing books up to id 250 (192 books)
with open(BOOKS_PATH, 'r', encoding='utf-8') as f:
    existing_books = json.load(f)

# Filter to id <= 250 in case of re-runs
existing_books = [b for b in existing_books if b.get('id', 0) <= 250]
all_books = existing_books + all_wishlist_books

print(f"Merged total books: {len(all_books)} (192 existing + 40 wishlist)")
assert len(all_books) == 232, f"Expected 232 books, got {len(all_books)}"

with open(BOOKS_PATH, 'w', encoding='utf-8') as f:
    json.dump(all_books, f, ensure_ascii=False, indent=2)
print(f"Successfully wrote {len(all_books)} books to {BOOKS_PATH}")

# Update site.json
with open(SITE_PATH, 'r', encoding='utf-8') as f:
    site_data = json.load(f)

dom10_exists = any(d['id'] == 'dom-10' for d in site_data['domains'])
if not dom10_exists:
    site_data['domains'].append({
        "id": "dom-10",
        "name": "主理人心愿精选",
        "slug": "curator-wishlist",
        "count": "40 本",
        "intro": "从主理人豆瓣想读（Wishlist）书单中严格筛选的 40 本高质量非虚构杰作，涵盖城市建筑、底层纪实、制度社会学、历史文明、心理认知与技术思考。"
    })
else:
    for d in site_data['domains']:
        if d['id'] == 'dom-10':
            d['count'] = "40 本"

site_data['title'] = f"经典书导读 · {len(site_data['domains'])} 大领域 · {len(all_books)} 本严选精读指南"
site_data['brandSub'] = f"CLASSIC BOOKS · {len(all_books)} MASTERPIECES"
site_data['heroTag'] = f"{len(site_data['domains'])} 大领域 · {len(all_books)} 本严选 · 章节对齐豆瓣原目录"
site_data['heroDesc'] = "软件工程 · 系统设计 · UI/UX · 产品经理 · 中国历史 · 建筑学 · 艺术 · 主理人五星 · 主理人四星 · 主理人心愿。每本书章节结构严格对齐原书目录，拒绝空话杜撰。"

with open(SITE_PATH, 'w', encoding='utf-8') as f:
    json.dump(site_data, f, ensure_ascii=False, indent=2)
print(f"Successfully updated site.json (totalBooks: {len(all_books)}, totalDomains: {len(site_data['domains'])})")
