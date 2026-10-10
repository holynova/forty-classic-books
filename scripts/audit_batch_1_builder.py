import json
import os

AUDIT_INPUT = '/Users/sym/Code/forty-classic-books/data/audit_batch_1.json'
AUDIT_OUTPUT = '/Users/sym/Code/forty-classic-books/data/audited_batch_1.json'

with open(AUDIT_INPUT, 'r', encoding='utf-8') as f:
    batch_raw = json.load(f)

print(f"Loaded {len(batch_raw)} items from {AUDIT_INPUT}")
