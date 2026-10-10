# -*- coding: utf-8 -*-
"""
Assemble audited_batch_3.json from Group 1, Group 2, and Group 3.
"""
import json
import sys
import os

sys.path.insert(0, '/Users/sym/.gemini/antigravity/brain/2347da2a-a516-4ec7-a372-9415b6e80942/scratch')
sys.path.insert(0, '/Users/sym/Code/forty-classic-books/scripts')

import build_group1
import build_group2
import build_group3_art

u1 = build_group1.get_group1_updates()
u2 = build_group2.get_group2_updates()
u3 = build_group3_art.get_group3_updates()

all_updates = {}
all_updates.update(u1)
all_updates.update(u2)
all_updates.update(u3)

print(f"Total updates loaded: {len(all_updates)} (IDs: {sorted(list(all_updates.keys()))})")

# Read batch 3 source
with open('/Users/sym/Code/forty-classic-books/data/audit_batch_3.json', 'r', encoding='utf-8') as f:
    batch_raw = json.load(f)

audited_list = []
for item in batch_raw:
    b = item['book']
    bid = b['id']
    if bid in all_updates:
        u = all_updates[bid]
        b['thesis'] = u['thesis']
        b['ideas'] = u['ideas']
        b['structure'] = u['structure']
    else:
        raise ValueError(f"Missing updates for book {bid}")
    audited_list.append(b)

output_path = '/Users/sym/Code/forty-classic-books/data/audited_batch_3.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(audited_list, f, ensure_ascii=False, indent=2)

print(f"Successfully generated {output_path} with {len(audited_list)} books.")
