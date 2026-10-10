# -*- coding: utf-8 -*-
"""
Assemble and export audited batch 2 books to data/audited_batch_2.json.
"""

import json
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, 'data')

from audit_batch_2_data_uiux import books_uiux
from audit_batch_2_data_pm import books_pm

with open(os.path.join(DATA_DIR, 'audit_batch_2.json'), 'r', encoding='utf-8') as f:
    batch_raw = json.load(f)

print(f"Loaded {len(batch_raw)} items from audit_batch_2.json")

audited_books = []
for item in batch_raw:
    orig_b = item['book']
    bid = orig_b['id']

    if bid in books_uiux:
        audited_content = books_uiux[bid]
    elif bid in books_pm:
        audited_content = books_pm[bid]
    else:
        raise ValueError(f"Book ID {bid} not found in audited content!")

    # Construct new book object preserving all metadata
    new_book = {
        "id": orig_b["id"],
        "slug": orig_b["slug"],
        "title": orig_b["title"],
        "domain": orig_b["domain"],
        "domainOrder": orig_b["domainOrder"],
        "author": orig_b["author"],
        "publisher": orig_b["publisher"],
        "publishYear": orig_b["publishYear"],
        "originalTitle": orig_b.get("originalTitle", ""),
        "doubanUrl": orig_b["doubanUrl"],
        "rating": orig_b["rating"],
        "ratingCount": orig_b["ratingCount"],
        "cover": orig_b["cover"],
        "intro": orig_b["intro"],
        "thesis": audited_content["thesis"],
        "ideas": audited_content["ideas"],
        "structure": audited_content["structure"]
    }

    audited_books.append(new_book)

output_path = os.path.join(DATA_DIR, 'audited_batch_2.json')
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(audited_books, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {output_path} with {len(audited_books)} books.")
