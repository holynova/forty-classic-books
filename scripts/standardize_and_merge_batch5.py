# -*- coding: utf-8 -*-
"""
Standardize all 30 books of Batch 5 (401-430), validate, merge into data/books.json, and update data/site.json.
"""
import json
import os

all_batch5 = []
for g in range(1, 7):
    path = f"data/batch5_group{g}.json"
    with open(path, "r", encoding="utf-8") as f:
        books = json.load(f)
        assert len(books) == 5, f"Group {g} must have 5 books, got {len(books)}"
        all_batch5.extend(books)

assert len(all_batch5) == 30, f"Expected 30 books in Batch 5, got {len(all_batch5)}"

forbidden = ["问题缘起", "机制探索", "田野现场", "行动建议", "理论反思"]

for idx, b in enumerate(all_batch5):
    expected_id = 401 + idx
    assert b["id"] == expected_id, f"ID mismatch: expected {expected_id}, got {b['id']}"
    assert b["slug"] == f"book-{expected_id}", f"Slug mismatch: {b['slug']}"
    assert b["title"].startswith("《") and b["title"].endswith("》"), f"Title format error: {b['title']}"
    assert b["domain"] == "主理人四星精选", f"Domain mismatch: {b['domain']}"
    assert b["domainOrder"] == f"第 {191 + idx} 本", f"DomainOrder mismatch: {b['domainOrder']}"
    assert b["verified"] is True, f"Verified must be True in {b['id']}"
    assert "," in b["ratingCount"], f"RatingCount must contain comma: {b['ratingCount']}"
    
    # Cover check
    cover_path = b["cover"]
    assert os.path.exists(cover_path), f"Cover missing: {cover_path}"
    assert os.path.getsize(cover_path) > 1000, f"Cover corrupted: {cover_path}"

    # Intro & Thesis
    assert len(b["intro"]) >= 30, f"Intro too short in {b['id']}"
    assert isinstance(b["thesis"], list) and len(b["thesis"]) >= 2, f"Thesis invalid in {b['id']}"

    # Ideas
    assert isinstance(b["ideas"], list) and len(b["ideas"]) >= 5, f"Ideas count < 5 in {b['id']}"
    for i in b["ideas"]:
        assert i.get("title") and i.get("desc") and i.get("example"), f"Incomplete idea in {b['id']}"
        for fbd in forbidden:
            assert fbd not in i["title"], f"Forbidden word '{fbd}' in idea title in {b['id']}"

    # Structure
    assert isinstance(b["structure"], list) and len(b["structure"]) >= 4, f"Structure count < 4 in {b['id']}"
    for s in b["structure"]:
        assert s.get("title") and s.get("desc") and s.get("example"), f"Incomplete structure in {b['id']}"
        for fbd in forbidden:
            assert fbd not in s["title"], f"Forbidden word '{fbd}' in structure title in {b['id']}"

print("All 30 books of Batch 5 passed 100% rigorous validation!")

# Save audited batch5 file
with open("data/batch5_30_audited.json", "w", encoding="utf-8") as f:
    json.dump(all_batch5, f, ensure_ascii=False, indent=2)

# Load existing books.json and merge
with open("data/books.json", "r", encoding="utf-8") as f:
    existing_books = json.load(f)

print(f"Existing books count before merge: {len(existing_books)}")

# Filter out any duplicate if present
filtered_existing = [b for b in existing_books if b["id"] < 401]
merged = filtered_existing + all_batch5
print(f"Total books after merge: {len(merged)}")
assert len(merged) == 397, f"Expected 397 books, got {len(merged)}"

with open("data/books.json", "w", encoding="utf-8") as f:
    json.dump(merged, f, ensure_ascii=False, indent=2)

print("data/books.json updated successfully with 397 books!")

# Update data/site.json
with open("data/site.json", "r", encoding="utf-8") as f:
    site = json.load(f)

site["title"] = "经典书导读 · 10 大领域 · 397 本严选非虚构经典"
site["brandSub"] = "CLASSIC BOOKS · 397 MASTERPIECES"
site["heroTag"] = "10 大领域 · 397 本严选 · 章节对齐原书目录"

for dom in site["domains"]:
    if dom["id"] == "dom-9":
        dom["count"] = "220 本"
        print(f"Updated dom-9 count to: {dom['count']}")

with open("data/site.json", "w", encoding="utf-8") as f:
    json.dump(site, f, ensure_ascii=False, indent=2)

print("data/site.json updated successfully!")
