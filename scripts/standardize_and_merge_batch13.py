# -*- coding: utf-8 -*-
import json
import os
import sys

FORBIDDEN_WORDS = [
    "问题缘起", "机制探索", "田野现场", "行动建议", 
    "理论反思", "案例剖析", "现状审视", "实践路径", "未来展望"
]

META_INFO = {
    641: {"publisher": "商务印书馆", "year": "1996", "isbn": "9787100013239"},
    642: {"publisher": "群众出版社", "year": "1996", "isbn": "9787501414451"},
    643: {"publisher": "东方出版社", "year": "2007", "isbn": "9787506027113"},
    644: {"publisher": "世界图书出版公司", "year": "2013", "isbn": "9787510065095"},
    645: {"publisher": "新星出版社", "year": "2022", "isbn": "9787513348614"},
    646: {"publisher": "生活·读书·新知三联书店", "year": "2013", "isbn": "9787108047020"},
    647: {"publisher": "上海三联书店", "year": "2012", "isbn": "9787542637994"},
    648: {"publisher": "中信出版社", "year": "2005", "isbn": "9787508603612"},
    649: {"publisher": "北京大学出版社", "year": "2009", "isbn": "9787301150894"},
    650: {"publisher": "人民邮电出版社", "year": "2009", "isbn": "9787115206632"},
    651: {"publisher": "中国轻工业出版社", "year": "2004", "isbn": "9787501944118"},
    652: {"publisher": "中国轻工业出版社", "year": "2014", "isbn": "9787501997381"},
    653: {"publisher": "人民邮电出版社", "year": "2022", "isbn": "9787115582317"},
    654: {"publisher": "中国青年出版社", "year": "2002", "isbn": "9787500649076"},
    655: {"publisher": "人民邮电出版社", "year": "2016", "isbn": "9787115439772"},
    656: {"publisher": "人民邮电出版社", "year": "2014", "isbn": "9787115340627"},
    657: {"publisher": "电子工业出版社", "year": "2019", "isbn": "9787121356889"},
    658: {"publisher": "东南大学出版社", "year": "2005", "isbn": "9787564100421"},
    659: {"publisher": "人民邮电出版社", "year": "2012", "isbn": "9787115283947"},
    660: {"publisher": "广西师范大学出版社", "year": "2009", "isbn": "9787563388790"},
    661: {"publisher": "福建教育出版社", "year": "1999", "isbn": "9787533428112"},
    662: {"publisher": "新星出版社", "year": "2009", "isbn": "9787802257917"},
    663: {"publisher": "中信出版集团", "year": "2020", "isbn": "9787521721591"},
    664: {"publisher": "脸谱出版社", "year": "2006", "isbn": "9789867059123"},
    665: {"publisher": "上海译文出版社", "year": "2020", "isbn": "9787532782352"},
    666: {"publisher": "人民邮电出版社", "year": "2020", "isbn": "9787115545718"},
    667: {"publisher": "中信出版社", "year": "2014", "isbn": "9787508646190"},
    668: {"publisher": "人民邮电出版社", "year": "2021", "isbn": "9787115555434"},
    669: {"publisher": "华文出版社", "year": "2010", "isbn": "9787507534436"},
    670: {"publisher": "上海三联书店", "year": "2024", "isbn": "9787542683410"}
}

def load_group(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def normalize_book(book):
    bid = book["id"]
    book["slug"] = f"book-{bid}"
    book["verified"] = True
    book["domain"] = "主理人心愿精选"
    book["domainOrder"] = f"第 {bid - 420} 本"
    
    # Title format
    title = book.get("title", "")
    if not title.startswith("《"):
        title = f"《{title}》"
    book["title"] = title
    
    # Rating count format
    rc = str(book.get("ratingCount", ""))
    if not rc.endswith("人评价"):
        rc = f"{rc}人评价"
    book["ratingCount"] = rc
    
    # Metadata fill
    if bid in META_INFO:
        for k, v in META_INFO[bid].items():
            if not book.get(k):
                book[k] = v
                
    # Thesis normalize
    thesis = book.get("thesis")
    if isinstance(thesis, str):
        paragraphs = [p.strip() for p in thesis.split("\n\n") if p.strip()]
        book["thesis"] = paragraphs
        
    return book

def audit_book(book):
    errors = []
    bid = book.get("id")
    if not bid or bid < 641 or bid > 670:
        errors.append(f"Invalid id {bid}")
    if book.get("slug") != f"book-{bid}":
        errors.append(f"Invalid slug {book.get('slug')} (expected book-{bid})")
    
    # Forbidden words
    book_str = json.dumps(book, ensure_ascii=False)
    for fw in FORBIDDEN_WORDS:
        if fw in book_str:
            errors.append(f"Forbidden word found: '{fw}'")
            
    # Cover check
    cover = book.get("cover", "")
    if not os.path.exists(cover):
        errors.append(f"Cover does not exist: {cover}")
    else:
        size = os.path.getsize(cover)
        if size < 1000:
            errors.append(f"Cover too small ({size} bytes): {cover}")
            
    # Rating count
    rc = book.get("ratingCount", "")
    if not isinstance(rc, str) or "," not in rc or not rc.endswith("人评价"):
        errors.append(f"ratingCount format abnormal: '{rc}'")
        
    # Ideas check
    ideas = book.get("ideas", [])
    if len(ideas) < 5 or len(ideas) > 8:
        errors.append(f"ideas count out of bounds ({len(ideas)}): expected 5-8")
    for idx, idea in enumerate(ideas):
        for field in ["num", "title", "desc", "example"]:
            if not idea.get(field):
                errors.append(f"idea[{idx}] missing '{field}'")
                
    # Structure check
    structure = book.get("structure", [])
    if len(structure) < 3:
        errors.append(f"structure items too few ({len(structure)})")
    for idx, st in enumerate(structure):
        for field in ["num", "title", "desc", "example"]:
            if not st.get(field):
                errors.append(f"structure[{idx}] missing '{field}'")
                
    # Thesis check
    thesis = book.get("thesis")
    if not isinstance(thesis, list) or len(thesis) < 2 or len(thesis) > 4:
        errors.append(f"thesis abnormal: {type(thesis)} {len(thesis) if isinstance(thesis, list) else 0}")
        
    return errors

def main():
    groups = [
        "data/batch13_group1.json",
        "data/batch13_group2.json",
        "data/batch13_group3.json",
        "data/batch13_group4.json",
        "data/batch13_group5.json",
        "data/batch13_group6.json"
    ]
    
    raw_books = []
    for g in groups:
        b_list = load_group(g)
        print(f"Loaded {g}: {len(b_list)} books")
        raw_books.extend(b_list)
        
    if len(raw_books) != 30:
        print(f"ERROR: Expected 30 books, got {len(raw_books)}")
        sys.exit(1)
        
    batch13_books = [normalize_book(b) for b in raw_books]
        
    # Audit each book
    total_errors = 0
    for book in batch13_books:
        errs = audit_book(book)
        if errs:
            print(f"Audit FAIL for #{book.get('id')} {book.get('title')}:")
            for e in errs:
                print(f"  - {e}")
            total_errors += len(errs)
        else:
            print(f"Audit PASS: #{book.get('id')} {book.get('title')} ({book.get('author')})")
            
    if total_errors > 0:
        print(f"Audit encountered {total_errors} errors! Halting merge.")
        sys.exit(1)
        
    print("\nAll 30 books passed audit with ZERO errors!")
    
    # Load data/books.json
    with open("data/books.json", "r", encoding="utf-8") as f:
        existing_books = json.load(f)
        
    base_books = [b for b in existing_books if b.get("id") < 641]
    print(f"Base existing books count (< 641): {len(base_books)}")
    
    merged_books = base_books + batch13_books
    merged_books.sort(key=lambda x: x.get("id"))
    print(f"New total books count: {len(merged_books)}")
    
    # Save books.json
    with open("data/books.json", "w", encoding="utf-8") as f:
        json.dump(merged_books, f, ensure_ascii=False, indent=2)
    print("Saved data/books.json successfully!")
    
    # Update data/site.json
    with open("data/site.json", "r", encoding="utf-8") as f:
        site_data = json.load(f)
        
    site_data["totalBooks"] = len(merged_books)
    if "domains" in site_data:
        for dom in site_data["domains"]:
            if dom.get("id") == "dom-10":
                dom["count"] = 250
                dom["description"] = "精选主理人私藏书单，涵盖计算机经典、社科文史、前沿思考与终身成长书目（共 250 本）"
                
    with open("data/site.json", "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)
    print(f"Saved data/site.json successfully! Total: {site_data['totalBooks']}, dom-10 count: 250")

if __name__ == "__main__":
    main()
