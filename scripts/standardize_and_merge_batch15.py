#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json
import os
import sys

BANNED_WORDS = [
    "问题缘起", "机制探索", "田野现场", "行动建议", "理论反思",
    "案例剖析", "现状审视", "实践路径", "未来展望"
]

def validate_and_merge():
    # 1. Load groups 1-6
    batch15_books = []
    for g in range(1, 7):
        fn = f"data/batch15_group{g}.json"
        if not os.path.exists(fn):
            print(f"Error: {fn} does not exist!")
            sys.exit(1)
        with open(fn, "r", encoding="utf-8") as f:
            books = json.load(f)
            print(f"Loaded {len(books)} books from {fn}")
            batch15_books.extend(books)

    if len(batch15_books) != 30:
        print(f"Error: Expected 30 books, got {len(batch15_books)}")
        sys.exit(1)

    # 2. Strict validation
    expected_ids = list(range(701, 731))
    for i, b in enumerate(batch15_books):
        book_id = b.get("id")
        if book_id != expected_ids[i]:
            print(f"Error: Book index {i} has id {book_id}, expected {expected_ids[i]}")
            sys.exit(1)

        # Check banned words in all string fields
        dumped = json.dumps(b, ensure_ascii=False)
        for bw in BANNED_WORDS:
            if bw in dumped:
                print(f"Error: Book {book_id} contains banned phrase '{bw}'!")
                sys.exit(1)

        # Cover check
        cover = b.get("cover", "")
        if not cover or not os.path.exists(cover):
            print(f"Error: Book {book_id} cover '{cover}' does not exist!")
            sys.exit(1)

        # ratingCount check
        rc = b.get("ratingCount", "")
        if "人评价" not in rc or "," not in rc:
            print(f"Error: Book {book_id} ratingCount '{rc}' missing comma or '人评价'!")
            sys.exit(1)

        # thesis check
        thesis = b.get("thesis")
        if not isinstance(thesis, list) or len(thesis) < 2:
            print(f"Error: Book {book_id} thesis must be a list of at least 2 paragraphs!")
            sys.exit(1)

        # ideas check
        ideas = b.get("ideas", [])
        if not isinstance(ideas, list) or len(ideas) < 5:
            print(f"Error: Book {book_id} ideas must have at least 5 items!")
            sys.exit(1)
        for item in ideas:
            for k in ["num", "title", "desc", "example"]:
                if not item.get(k):
                    print(f"Error: Book {book_id} idea missing key {k}!")
                    sys.exit(1)

        # structure check
        struct = b.get("structure", [])
        if not isinstance(struct, list) or len(struct) < 3:
            print(f"Error: Book {book_id} structure must have at least 3 chapters!")
            sys.exit(1)
        for item in struct:
            for k in ["num", "title", "desc", "example"]:
                if not item.get(k):
                    print(f"Error: Book {book_id} structure chapter missing key {k}!")
                    sys.exit(1)

        # metadata checks
        if b.get("domain") != "主理人心愿精选":
            print(f"Error: Book {book_id} domain is {b.get('domain')}")
            sys.exit(1)
        expected_order = f"第 {book_id - 420} 本"
        if b.get("domainOrder") != expected_order:
            print(f"Error: Book {book_id} domainOrder is {b.get('domainOrder')}, expected {expected_order}")
            sys.exit(1)
        if b.get("slug") != f"book-{book_id}":
            print(f"Error: Book {book_id} slug is {b.get('slug')}")
            sys.exit(1)
        if b.get("verified") is not True:
            print(f"Error: Book {book_id} verified is not True")
            sys.exit(1)

    print("All 30 books passed strict audit checks!")

    # 3. Merge into data/books.json
    books_file = "data/books.json"
    with open(books_file, "r", encoding="utf-8") as f:
        all_books = json.load(f)

    base_books = [b for b in all_books if b["id"] < 701]
    print(f"Retained {len(base_books)} existing books (< 701).")

    final_books = base_books + batch15_books
    print(f"Final book count: {len(final_books)}")

    with open(books_file, "w", encoding="utf-8") as f:
        json.dump(final_books, f, ensure_ascii=False, indent=2)
    print(f"Successfully saved {books_file} with {len(final_books)} books.")

    # 4. Update data/site.json
    site_file = "data/site.json"
    with open(site_file, "r", encoding="utf-8") as f:
        site_data = json.load(f)

    site_data["totalBooks"] = len(final_books)
    for dom in site_data.get("domains", []):
        if dom.get("id") == "dom-10" or dom.get("name") == "主理人心愿精选":
            dom["count"] = 310
            print(f"Updated domain '{dom.get('name')}' count to {dom['count']}")

    with open(site_file, "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)
    print(f"Successfully updated {site_file} with totalBooks = {site_data['totalBooks']}.")

if __name__ == "__main__":
    validate_and_merge()
