# -*- coding: utf-8 -*-
"""
Screen and curate high-value non-fiction masterpieces from mobile_sang's Douban Wishlist.
Excludes fiction/novels, comics/manga, poetry, calligraphy, photography, journals/magazines,
and duplicates already present in Books 1-250.
"""

import json
import os
import re

BASE_DIR = '/Users/sym/Code/forty-classic-books'
DATA_DIR = os.path.join(BASE_DIR, 'data')

with open(os.path.join(DATA_DIR, 'douban_wishlist_all.json'), 'r', encoding='utf-8') as f:
    wishlist = json.load(f)

# Collect all existing titles from books.json and audit_4star batches
existing_titles = set()
if os.path.exists(os.path.join(DATA_DIR, 'books.json')):
    with open(os.path.join(DATA_DIR, 'books.json'), 'r', encoding='utf-8') as f:
        for b in json.load(f):
            existing_titles.add(re.sub(r'[《》\s]', '', b['title']).lower())

for bf in ['audit_4star_batch_1.json', 'audit_4star_batch_2.json', 'audit_4star_batch_3.json', 'audit_4star_batch_4.json']:
    p = os.path.join(DATA_DIR, bf)
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            for b in json.load(f):
                existing_titles.add(re.sub(r'[《》\s]', '', b['title']).lower())

# Explicit fiction / novels / literary stories / comics / magazines keywords
fiction_patterns = [
    r'小说', r'中篇', r'短篇', r'长篇', r'推理', r'悬疑', r'科幻', r'童话', r'寓言',
    r'故事集', r'诗集', r'诗选', r'漫画', r'绘本', r'画册', r'影集', r'字帖', r'临摹',
    r'读库', r'单读', r'知日', r'剧本', r'戏剧', r'传奇', r'破案', r'案录', r'探案'
]

known_fiction_authors = [
    '绫辻行人', '东野圭吾', '伊坂幸太郎', '紫金陈', '阿加莎', '柯南·道尔', '金庸', '古龙',
    '斯蒂芬·金', '特德·姜', '刘慈欣', '阿西莫夫', '克拉克', '太宰治', '村上春树',
    '马尔克斯', '博尔赫斯', '卡尔维诺', '陀思妥耶夫斯基', '托尔斯泰', '契诃夫', '莫泊桑',
    '欧·亨利', '卡夫卡', '伍尔夫', '海明威', '菲茨杰拉德', '芥川龙之介', '川端康成',
    '林奕含', '金宇澄', '崔恩荣', '郑智我', '欧文·亚隆', '茨威格', '门罗', '韩江',
    '斯蒂芬森', '爱伦·坡', '三岛由纪夫', '黑塞', '塞林格', '纳博科夫'
]

# Explicit known fiction titles
known_fiction_titles = {
    '迷宫馆事件', '钟表馆事件', '油炸绿番茄', '父亲的解放日志', '雪崩', '象棋的故事',
    '房思琪的初恋乐园', '50：伟大的短篇小说们', '明亮的夜晚', '繁花', '诊疗椅上的谎言',
    '關於地球的運動1', '關於地球的運動', '关于地球的运动', '沉默时，请大声朗读情书'
}

qualified = []
duplicates = []
rejected = []

for b in wishlist:
    title = b.get('title', '').strip()
    norm_title = re.sub(r'[《》\s]', '', title).lower()
    pub = b.get('pub', '').strip()
    combined = f"{title} {pub}"

    # 1. Check duplicate
    if norm_title in existing_titles:
        duplicates.append({'title': title, 'reason': 'Already in project (Books 1-250)'})
        continue

    # 2. Check explicit fiction title
    if any(kft in title for kft in known_fiction_titles):
        rejected.append({'title': title, 'pub': pub, 'reason': 'Known fiction title'})
        continue

    # 3. Check fiction author
    is_f_author = False
    for fa in known_fiction_authors:
        if fa in pub or fa in title:
            rejected.append({'title': title, 'pub': pub, 'reason': f'Fiction author: {fa}'})
            is_f_author = True
            break
    if is_f_author:
        continue

    # 4. Check keywords
    is_f_kw = False
    for pat in fiction_patterns:
        if re.search(pat, combined):
            # Special exceptions for non-fiction books that have '故事' or '文集' in sub-clauses
            if '思考，快与慢' in title or '历史' in title or '经济' in title or '社会' in title:
                continue
            rejected.append({'title': title, 'pub': pub, 'reason': f'Fiction keyword: {pat}'})
            is_f_kw = True
            break
    if is_f_kw:
        continue

    qualified.append(b)

print(f"Total Wishlist Books: {len(wishlist)}")
print(f"Duplicates with existing: {len(duplicates)}")
print(f"Rejected (Fiction/Comics/Magazines): {len(rejected)}")
print(f"Qualified Non-Fiction Candidates: {len(qualified)}")

with open(os.path.join(DATA_DIR, 'curated_wishlist_candidates.json'), 'w', encoding='utf-8') as f:
    json.dump(qualified, f, ensure_ascii=False, indent=2)

with open(os.path.join(DATA_DIR, 'wishlist_rejected.json'), 'w', encoding='utf-8') as f:
    json.dump(rejected, f, ensure_ascii=False, indent=2)

print(f"\nSaved {len(qualified)} candidates to data/curated_wishlist_candidates.json")
