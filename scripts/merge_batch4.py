# -*- coding: utf-8 -*-
"""
Merge Batch 4 (30 books: 371-400) into data/books.json and update data/site.json.
Performs 100% comprehensive validation before saving.
"""
import json
import os

# 1. Load all 6 groups of Batch 4
batch4_books = []
for g in range(1, 7):
    path = f"data/batch4_group{g}.json"
    with open(path, "r", encoding="utf-8") as f:
        group_books = json.load(f)
        assert len(group_books) == 5, f"Group {g} must have exactly 5 books, got {len(group_books)}"
        batch4_books.extend(group_books)

assert len(batch4_books) == 30, f"Batch 4 must have exactly 30 books, got {len(batch4_books)}"

# Save batch4 audited file
with open("data/batch4_30_audited.json", "w", encoding="utf-8") as f:
    json.dump(batch4_books, f, ensure_ascii=False, indent=2)
print("Saved data/batch4_30_audited.json successfully.")

# 2. Validate every book in Batch 4
forbidden_patterns = ["问题缘起", "机制探索", "田野现场", "行动建议", "理论反思"]

for idx, b in enumerate(batch4_books):
    expected_id = 371 + idx
    assert b["id"] == expected_id, f"Book id mismatch: expected {expected_id}, got {b['id']}"
    assert b["category"] == "主理人四星精选", f"Book {b['id']} category mismatch"
    assert b["verified"] is True, f"Book {b['id']} verified must be True"
    assert "," in b["ratings_count"], f"Book {b['id']} ratings_count must have comma separator: {b['ratings_count']}"
    
    # Check cover
    cover_path = b["cover"]
    assert os.path.exists(cover_path), f"Cover missing for book {b['id']}: {cover_path}"
    assert os.path.getsize(cover_path) > 1000, f"Cover empty or corrupted for book {b['id']}: {cover_path}"

    # Check intro and thesis
    assert len(b["intro"]) >= 30, f"Intro too short for book {b['id']}"
    assert isinstance(b["thesis"], list) and len(b["thesis"]) >= 2, f"Thesis list invalid for book {b['id']}"

    # Check ideas
    assert isinstance(b["ideas"], list) and len(b["ideas"]) >= 5, f"Ideas count < 5 for book {b['id']}"
    for idea in b["ideas"]:
        assert idea.get("title") and idea.get("desc") and idea.get("example"), f"Idea incomplete in book {b['id']}"
        for forb in forbidden_patterns:
            assert forb not in idea["title"], f"Forbidden phrase '{forb}' in idea title: {b['id']}"

    # Check chapters
    assert isinstance(b["chapters"], list) and len(b["chapters"]) >= 4, f"Chapters count < 4 for book {b['id']}"
    for ch in b["chapters"]:
        assert ch.get("title") and ch.get("desc") and ch.get("example"), f"Chapter incomplete in book {b['id']}"
        for forb in forbidden_patterns:
            assert forb not in ch["title"], f"Forbidden phrase '{forb}' in chapter title: {b['id']}"

print("All 30 books in Batch 4 passed rigorous validation!")

# 3. Load existing books.json and merge
with open("data/books.json", "r", encoding="utf-8") as f:
    existing_books = json.load(f)

print(f"Existing books count: {len(existing_books)}")
existing_ids = {b["id"] for b in existing_books}

for b in batch4_books:
    assert b["id"] not in existing_ids, f"Duplicate book id detected: {b['id']}"
    existing_books.append(b)

total_books = len(existing_books)
assert total_books == 367, f"Expected total 367 books, got {total_books}"

with open("data/books.json", "w", encoding="utf-8") as f:
    json.dump(existing_books, f, ensure_ascii=False, indent=2)

print(f"data/books.json updated successfully: total {total_books} books.")

# 4. Update data/site.json
with open("data/site.json", "r", encoding="utf-8") as f:
    site = json.load(f)

site["title"] = "经典书导读 · 10 大领域 · 367 本严选非虚构经典"
site["brandSub"] = "CLASSIC BOOKS · 367 MASTERPIECES"
site["heroTag"] = "10 大领域 · 367 本严选 · 章节对齐原书目录"

# Update dom-9 count (160 -> 190)
for dom in site["domains"]:
    if dom["id"] == "dom-9":
        dom["count"] = "190 本"
        print(f"Updated dom-9 count to: {dom['count']}")

with open("data/site.json", "w", encoding="utf-8") as f:
    json.dump(site, f, ensure_ascii=False, indent=2)

print("data/site.json updated successfully.")
