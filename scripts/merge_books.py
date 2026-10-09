# -*- coding: utf-8 -*-
import json
import os
import sys

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT_DIR)
DATA_DIR = os.path.join(ROOT_DIR, 'data')
BOOKS_JSON_PATH = os.path.join(DATA_DIR, 'books.json')

from scripts.data_history import history_books
from scripts.data_architecture import architecture_books
from scripts.data_art import art_books

with open(BOOKS_JSON_PATH, 'r', encoding='utf-8') as f:
    existing_books = json.load(f)

# Keep only the original first 40 books if re-running
original_40 = [b for b in existing_books if b['id'] <= 40]

print(f"Original books count: {len(original_40)}")
print(f"History books count: {len(history_books)}")
print(f"Architecture books count: {len(architecture_books)}")
print(f"Art books count: {len(art_books)}")

combined = original_40 + history_books + architecture_books + art_books
print(f"Total combined books count: {len(combined)}")

# Validation check
errors = []
if len(combined) != 70:
    errors.append(f"Combined books count must be 70, got {len(combined)}")

seen_ids = set()
for b in combined:
    bid = b.get('id')
    if bid in seen_ids:
        errors.append(f"Duplicate ID {bid}")
    seen_ids.add(bid)
    
    slug = b.get('slug')
    pad = str(bid).padStart(2, '0') if hasattr(str(bid), 'padStart') else f"{bid:02d}"
    if slug != f"book-{pad}":
        errors.append(f"Invalid slug {slug} for ID {bid}")
        
    intro = b.get('intro', '').strip()
    if not intro:
        errors.append(f"[{slug}] Missing intro")
        
    thesis = b.get('thesis', [])
    if not isinstance(thesis, list) or len(thesis) < 2 or len(thesis) > 4:
        errors.append(f"[{slug}] Thesis length should be 2-4, got {len(thesis)}")
        
    ideas = b.get('ideas', [])
    if not isinstance(ideas, list) or len(ideas) < 5 or len(ideas) > 8:
        errors.append(f"[{slug}] Ideas length should be 5-8, got {len(ideas)}")
    else:
        for idea in ideas:
            if not idea.get('title') or not idea.get('desc') or not idea.get('example'):
                errors.append(f"[{slug}] Idea {idea.get('num')} missing title/desc/example")
                
    structure = b.get('structure', [])
    if not isinstance(structure, list) or len(structure) < 1:
        errors.append(f"[{slug}] Structure empty")
    else:
        for part in structure:
            if not part.get('title') or not part.get('desc') or not part.get('example'):
                errors.append(f"[{slug}] Structure part missing title/desc/example")
                
    cover = b.get('cover', '')
    cover_path = os.path.join(ROOT_DIR, cover)
    if not os.path.exists(cover_path) or os.path.getsize(cover_path) < 1000:
        errors.append(f"[{slug}] Cover missing or corrupt: {cover}")

if errors:
    print(f"Validation failed with {len(errors)} errors:")
    for e in errors:
        print(f" - {e}")
    sys.exit(1)

with open(BOOKS_JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(combined, f, ensure_ascii=False, indent=2)

print(f"Successfully saved {len(combined)} books to {BOOKS_JSON_PATH}")
