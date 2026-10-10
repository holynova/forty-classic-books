#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build audited_batch_4a.json with rigorous checks for all 21 books.
"""

import json
import os
import sys

from audit_group1 import GROUP1
from audit_group2 import GROUP2
from audit_group3 import GROUP3
from audit_group4 import GROUP4

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, 'data')
AUDIT_INPUT = os.path.join(DATA_DIR, 'audit_batch_4a.json')
AUDIT_OUTPUT = os.path.join(DATA_DIR, 'audited_batch_4a.json')

# Merge all groups
AUDITED_MAP = {}
AUDITED_MAP.update(GROUP1)
AUDITED_MAP.update(GROUP2)
AUDITED_MAP.update(GROUP3)
AUDITED_MAP.update(GROUP4)

print(f"Total audited books in map: {len(AUDITED_MAP)}")

with open(AUDIT_INPUT, 'r', encoding='utf-8') as f:
    batch_data = json.load(f)

print(f"Input batch 4a items: {len(batch_data)}")

audited_result = []

for idx, item in enumerate(batch_data):
    original_book = item['book']
    bid = original_book['id']
    title = original_book['title']
    
    if bid not in AUDITED_MAP:
        raise ValueError(f"Missing audit data for book id {bid} ({title})")
        
    audit_data = AUDITED_MAP[bid]
    
    # Construct updated book object preserving all metadata
    updated_book = {
        'id': original_book['id'],
        'slug': original_book['slug'],
        'title': original_book['title'],
        'domain': original_book.get('domain', ''),
        'domainOrder': original_book.get('domainOrder', ''),
        'author': original_book.get('author', ''),
        'publisher': original_book.get('publisher', ''),
        'publishYear': original_book.get('publishYear', ''),
        'originalTitle': original_book.get('originalTitle', ''),
        'doubanUrl': original_book.get('doubanUrl', ''),
        'rating': original_book.get('rating', ''),
        'ratingCount': original_book.get('ratingCount', ''),
        'cover': original_book.get('cover', ''),
        'intro': original_book.get('intro', ''),
        'thesis': audit_data['thesis'],
        'ideas': audit_data['ideas'],
        'structure': audit_data['structure']
    }
    
    # Validation checks
    assert 2 <= len(updated_book['thesis']) <= 4, f"Book {bid} thesis count invalid: {len(updated_book['thesis'])}"
    assert 5 <= len(updated_book['ideas']) <= 8, f"Book {bid} ideas count invalid: {len(updated_book['ideas'])}"
    assert len(updated_book['structure']) >= 3, f"Book {bid} structure parts too few: {len(updated_book['structure'])}"
    
    for idea in updated_book['ideas']:
        assert isinstance(idea['num'], int), f"Idea num must be int: {idea}"
        assert idea['title'] and idea['desc'] and idea['example'], f"Idea missing fields: {idea}"
        
    for part in updated_book['structure']:
        assert isinstance(part['num'], int), f"Structure num must be int: {part}"
        assert part['title'] and part['desc'] and part['example'], f"Structure missing fields: {part}"
        
    audited_result.append(updated_book)
    print(f"[{idx+1}/21] Audited ID {bid}: {title} | Structure parts: {len(updated_book['structure'])} | Ideas: {len(updated_book['ideas'])}")

with open(AUDIT_OUTPUT, 'w', encoding='utf-8') as f:
    json.dump(audited_result, f, ensure_ascii=False, indent=2)

print(f"\nSuccessfully wrote {len(audited_result)} audited books to {AUDIT_OUTPUT}")
