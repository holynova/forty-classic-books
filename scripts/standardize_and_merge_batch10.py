import json
import os
import sys

# 1. Load groups 1 to 6
groups = []
for g in range(1, 7):
    path = f"data/batch10_group{g}.json"
    if not os.path.exists(path):
        print(f"Error: {path} not found!")
        sys.exit(1)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
        print(f"Loaded {path}: {len(data)} books")
        groups.extend(data)

if len(groups) != 30:
    print(f"Error: expected 30 books, found {len(groups)}")
    sys.exit(1)

# 2. Strict Quality Audit
forbidden_keywords = [
    "问题缘起", "机制探索", "田野现场", "行动建议", "理论反思",
    "案例剖析", "现状审视", "实践路径", "未来展望"
]

audited_books = []
expected_ids = list(range(551, 581))

for i, book in enumerate(groups):
    bid = book.get("id")
    if bid != expected_ids[i]:
        print(f"ID mismatch at index {i}: expected {expected_ids[i]}, got {bid}")
        sys.exit(1)
    
    title = book.get("title", "")
    if not (title.startswith("《") and title.endswith("》")):
        print(f"Book {bid} title format invalid: {title}")
        sys.exit(1)
        
    cover = book.get("cover", "")
    if not os.path.exists(cover) or os.path.getsize(cover) < 1000:
        print(f"Book {bid} cover missing or too small: {cover}")
        sys.exit(1)
        
    if book.get("domain") != "主理人心愿精选":
        print(f"Book {bid} domain invalid: {book.get('domain')}")
        sys.exit(1)
        
    expected_order = f"第 {bid - 420} 本"
    if book.get("domainOrder") != expected_order:
        print(f"Book {bid} domainOrder mismatch: expected {expected_order}, got {book.get('domainOrder')}")
        sys.exit(1)
        
    if not book.get("verified"):
        print(f"Book {bid} not marked verified")
        sys.exit(1)
        
    rc = str(book.get("ratingCount", ""))
    if not ("人评价" in rc or "," in rc):
        print(f"Book {bid} ratingCount invalid: {rc}")
        sys.exit(1)
        
    thesis = book.get("thesis", [])
    if not isinstance(thesis, list) or len(thesis) < 2:
        print(f"Book {bid} thesis invalid: {len(thesis)} items")
        sys.exit(1)
        
    ideas = book.get("ideas", [])
    if not isinstance(ideas, list) or len(ideas) < 5:
        print(f"Book {bid} ideas invalid: {len(ideas)} items")
        sys.exit(1)
        
    for idea in ideas:
        for k in ["num", "title", "desc", "example"]:
            if not idea.get(k):
                print(f"Book {bid} idea missing {k}: {idea}")
                sys.exit(1)
        for kw in forbidden_keywords:
            if kw in idea["title"]:
                print(f"Book {bid} idea title contains forbidden keyword '{kw}': {idea['title']}")
                sys.exit(1)
                
    structure = book.get("structure", [])
    if not isinstance(structure, list) or len(structure) < 3:
        print(f"Book {bid} structure invalid: {len(structure)} items")
        sys.exit(1)
        
    for ch in structure:
        for k in ["num", "title", "desc", "example"]:
            if not ch.get(k):
                print(f"Book {bid} structure missing {k}: {ch}")
                sys.exit(1)
        for kw in forbidden_keywords:
            if kw in ch["title"]:
                print(f"Book {bid} structure title contains forbidden keyword '{kw}': {ch['title']}")
                sys.exit(1)
                
    slug = book.get("slug")
    if slug != f"book-{bid}":
        book["slug"] = f"book-{bid}"

    audited_books.append(book)

print("All 30 books for Batch 10 passed 100% strict audit!")

# Save audited batch
with open("data/batch10_30_audited.json", "w", encoding="utf-8") as f:
    json.dump(audited_books, f, ensure_ascii=False, indent=2)

# Remove undefined.html if present
if os.path.exists("undefined.html"):
    os.remove("undefined.html")
    print("Removed dangling undefined.html")

# 3. Read data/books.json
with open("data/books.json", "r", encoding="utf-8") as f:
    existing_books = json.load(f)

# Keep base books < 551
base_books = [b for b in existing_books if b["id"] < 551]
print(f"Base books count (< 551): {len(base_books)} (expected 517)")

# Merge
all_books = base_books + audited_books
print(f"Merged books count: {len(all_books)} (expected 547)")

with open("data/books.json", "w", encoding="utf-8") as f:
    json.dump(all_books, f, ensure_ascii=False, indent=2)
print("Updated data/books.json successfully.")

# 4. Update data/site.json
with open("data/site.json", "r", encoding="utf-8") as f:
    site_config = json.load(f)

site_config["title"] = f"经典书导读 · 10 大领域 · {len(all_books)} 本严选非虚构经典"
site_config["brandSub"] = f"CLASSIC BOOKS · {len(all_books)} MASTERPIECES"
site_config["heroTag"] = f"10 大领域 · {len(all_books)} 本严选 · 章节对齐原书目录"

# Update domain 10
for dom in site_config.get("domains", []):
    if dom.get("id") == "dom-10" or dom.get("name") == "主理人心愿精选":
        dom["count"] = "160 本"
        dom["intro"] = "从主理人豆瓣想读（Wishlist）书单中筛选的 160 本高质量非虚构杰作，已逐本完成真实出版目录与深度导读核验。"

with open("data/site.json", "w", encoding="utf-8") as f:
    json.dump(site_config, f, ensure_ascii=False, indent=2)
print("Updated data/site.json successfully.")
