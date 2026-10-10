#!/usr/bin/env python3
import json
import os
import sys

# Add scripts directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from group1_data import group1_audited
from group2_data import group2_audited
from group3_data import group3_audited

BATCH_FILE = "/Users/sym/Code/forty-classic-books/data/audit_batch_4b.json"
OUTPUT_FILE = "/Users/sym/Code/forty-classic-books/data/audited_batch_4b.json"

with open(BATCH_FILE, 'r', encoding='utf-8') as f:
    batch_data = json.load(f)

all_audited = {}
all_audited.update(group1_audited)
all_audited.update(group2_audited)
all_audited.update(group3_audited)

print(f"Total books in batch 4b: {len(batch_data)}")
print(f"Total audited books prepared: {len(all_audited)}")

results = []
errors = []

for idx, item in enumerate(batch_data):
    b = item['book']
    bid = b['id']
    title = b['title']

    if bid not in all_audited:
        errors.append(f"Missing audit data for book ID {bid}: {title}")
        continue

    audited = all_audited[bid]

    # Update thesis, ideas, structure
    b['thesis'] = audited['thesis']
    b['ideas'] = audited['ideas']
    b['structure'] = audited['structure']

    # Validate thesis
    if not isinstance(b['thesis'], list) or len(b['thesis']) < 2 or len(b['thesis']) > 4:
        errors.append(f"Book {bid} ({title}) invalid thesis count: {len(b['thesis'])}")

    # Validate ideas
    if not isinstance(b['ideas'], list) or len(b['ideas']) < 5 or len(b['ideas']) > 8:
        errors.append(f"Book {bid} ({title}) invalid ideas count: {len(b['ideas'])}")
    else:
        for idea in b['ideas']:
            if not idea.get('title') or not idea.get('desc') or not idea.get('example'):
                errors.append(f"Book {bid} ({title}) idea {idea.get('num')} missing fields")

    # Validate structure
    if not isinstance(b['structure'], list) or len(b['structure']) == 0:
        errors.append(f"Book {bid} ({title}) empty structure")
    else:
        for part in b['structure']:
            if not part.get('title') or not part.get('desc') or not part.get('example'):
                errors.append(f"Book {bid} ({title}) structure part {part.get('title')} missing fields")

    results.append(b)

if errors:
    print(f"❌ Found {len(errors)} errors:")
    for e in errors:
        print("  -", e)
    sys.exit(1)

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print(f"✅ Successfully wrote {len(results)} audited books to {OUTPUT_FILE}")
for idx, b in enumerate(results):
    print(f"  {idx+1:2d}. [{b['slug']}] ID:{b['id']} {b['title']} | structure: {len(b['structure'])} parts | ideas: {len(b['ideas'])} ideas | thesis: {len(b['thesis'])} paras")
