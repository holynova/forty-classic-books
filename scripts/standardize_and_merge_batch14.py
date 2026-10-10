# -*- coding: utf-8 -*-
import json
import os
import sys

FORBIDDEN_WORDS = [
    "问题缘起", "机制探索", "田野现场", "行动建议", 
    "理论反思", "案例剖析", "现状审视", "实践路径", "未来展望"
]

META_INFO = {
    671: {"publisher": "天津人民出版社", "year": "2017", "isbn": "9787201111667"},
    672: {"publisher": "上海译文出版社", "year": "2010", "isbn": "9787532750078"},
    673: {"publisher": "上海译文出版社", "year": "2017", "isbn": "9787532774081"},
    674: {"publisher": "江苏凤凰文艺出版社", "year": "2019", "isbn": "9787559434869"},
    675: {"publisher": "上海人民出版社", "year": "2016", "isbn": "9787208139596"},
    676: {"publisher": "人民文学出版社", "year": "2017", "isbn": "9787020121113"},
    677: {"publisher": "译林出版社", "year": "2005", "isbn": "9787806577882"},
    678: {"publisher": "上海译文出版社", "year": "2018", "isbn": "9787532777471"},
    679: {"publisher": "上海译文出版社", "year": "2012", "isbn": "9787532757275"},
    680: {"publisher": "上海译文出版社", "year": "2013", "isbn": "9787532761890"},
    681: {"publisher": "译林出版社", "year": "2008", "isbn": "9787544704380"},
    682: {"publisher": "广西师范大学出版社", "year": "2018", "isbn": "9787559811561"},
    683: {"publisher": "广西师范大学出版社", "year": "2017", "isbn": "9787559801456"},
    684: {"publisher": "江苏凤凰文艺出版社", "year": "2016", "isbn": "9787539989891"},
    685: {"publisher": "南海出版公司", "year": "2010", "isbn": "9787544245876"},
    686: {"publisher": "人民文学出版社", "year": "2003", "isbn": "9787020042456"},
    687: {"publisher": "上海锦绣文章出版社", "year": "2008", "isbn": "9787545200270"},
    688: {"publisher": "作家出版社", "year": "2010", "isbn": "9787506354424"},
    689: {"publisher": "人民文学出版社", "year": "2008", "isbn": "9787020067640"},
    690: {"publisher": "机械工业出版社", "year": "2011", "isbn": "9787111333333"},
    691: {"publisher": "中信出版集团", "year": "2023", "isbn": "9787521758902"},
    692: {"publisher": "浙江科学技术出版社", "year": "2021", "isbn": "9787555299400"},
    693: {"publisher": "电子工业出版社", "year": "2018", "isbn": "9787121347963"},
    694: {"publisher": "机械工业出版社", "year": "2021", "isbn": "9787111689102"},
    695: {"publisher": "电子工业出版社", "year": "2020", "isbn": "9787121396342"},
    696: {"publisher": "上海人民美术出版社", "year": "2013", "isbn": "9787532283996"},
    697: {"publisher": "中国轻工业出版社", "year": "2015", "isbn": "9787501999866"},
    698: {"publisher": "北京联合出版公司", "year": "2021", "isbn": "9787559654854"},
    699: {"publisher": "中国建筑工业出版社", "year": "2020", "isbn": "9787112248583"},
    700: {"publisher": "中信出版集团", "year": "2019", "isbn": "9787508696232"}
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
    elif isinstance(thesis, list):
        book["thesis"] = [p.strip() for p in thesis if p.strip()]
        
    return book

def audit_book(book):
    errors = []
    bid = book.get("id")
    if not bid or bid < 671 or bid > 700:
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
        "data/batch14_group1.json",
        "data/batch14_group2.json",
        "data/batch14_group3.json",
        "data/batch14_group4.json",
        "data/batch14_group5.json",
        "data/batch14_group6.json"
    ]
    
    raw_books = []
    for g in groups:
        b_list = load_group(g)
        print(f"Loaded {g}: {len(b_list)} books")
        raw_books.extend(b_list)
        
    if len(raw_books) != 30:
        print(f"ERROR: Expected 30 books, got {len(raw_books)}")
        sys.exit(1)
        
    batch14_books = [normalize_book(b) for b in raw_books]
        
    # Audit each book
    total_errors = 0
    for book in batch14_books:
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
        
    base_books = [b for b in existing_books if b.get("id") < 671]
    print(f"Base existing books count (< 671): {len(base_books)}")
    
    merged_books = base_books + batch14_books
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
                dom["count"] = 280
                dom["description"] = "精选主理人私藏书单，涵盖计算机经典、社科文史、前沿思考与终身成长书目（共 280 本）"
                
    with open("data/site.json", "w", encoding="utf-8") as f:
        json.dump(site_data, f, ensure_ascii=False, indent=2)
    print(f"Saved data/site.json successfully! Total: {site_data['totalBooks']}, dom-10 count: 280")

if __name__ == "__main__":
    main()
