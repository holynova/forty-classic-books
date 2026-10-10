#!/usr/bin/env python3
"""
Prepare audit batches with verified Ground Truth TOCs and intros for subagents.
"""

import json
import os

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT_DIR, 'data')

with open(os.path.join(DATA_DIR, 'books.json'), 'r', encoding='utf-8') as f:
    books = json.load(f)

with open(os.path.join(DATA_DIR, 'ground_truth_tocs.json'), 'r', encoding='utf-8') as f:
    gt = json.load(f)

# Rejection list for Curator books (IDs 71-170)
reject_reasons = {
    71: '秋山亮二摄影集，纯摄影画册无文字章节，不符合非虚构导读体系',
    89: '小林一茶俳句译集，短诗短句罗列，无分析性章节',
    90: '海桑现代抒情诗集，无系统论著框架',
    93: '伍绮诗虚构小说《无声告白》，文学叙事非论著方法论',
    96: '海桑散文随笔集《不如让每天发生些小事情》，无结构化章节',
    98: '余秀华诗集《月光落在左手上》，纯诗歌作品',
    99: '海桑诗集《我是你流浪过的一个地方》，纯诗歌作品',
    101: '阿乙虚构犯罪小说《下面，我该干些什么》',
    102: '吴军《硅谷之谜》，豆瓣原始条目目录缺失，材料不充分，拒绝创建以防杜撰',
    105: '林夕随笔感悟集《原来你非不快乐》，缺乏体系化章节',
    107: '斯坦诺维奇《与“众”不同的心理学》早期条目目录缺失，材料不充分',
    112: '周慧珺书法行书字帖，纯字形临摹无章节结构',
    114: '道格拉斯·亚当斯科幻小说《宇宙尽头的餐馆》',
    115: '刘天昭随笔断章集《出神》，碎片化记录无论述体系',
    116: '囧叔网络搞笑故事集《我讲个笑话，你可别哭啊》',
    118: '都梁军旅长篇小说《亮剑》',
    119: '刘慈欣科幻小说《三体Ⅱ：黑暗森林》',
    120: '高军市井杂谈随笔《世间的盐》',
    121: '涂老鸦手绘漫画《小老爷们儿那点事儿》',
    122: '刘墉通俗处世小品《把话说到心窝里》，条目目录缺失',
    127: '新垣平武侠伪史《剑桥倚天屠龙史》，同人恶搞文学',
    128: '罗斯金《政治科学》高校教材，条目目录缺失，材料不充分',
    129: '焦波摄影纪实画册《俺爹俺娘》',
    131: '乔治·奥威尔讽刺小说《一九八四·动物农场》',
    133: '埃舍尔版画解析画册《魔镜》，条目目录缺失',
    134: '李海鹏自传体长篇小说《晚来寂静》',
    135: '米兰·昆德拉小说《不能承受的生命之轻》',
    136: '乔治·奥威尔寓言小说《动物庄园》',
    137: '刘瑜早期情感问答集《那么，爱呢？》',
    138: '刘瑜个人小说随笔《余欢》',
    143: '张立宪随笔集《闪开，让我歌唱八十年代》',
    144: '连岳情感信箱问答《我爱问连岳Ⅱ》',
    146: '梁文道时评短文《常识》，条目目录缺失',
    147: '富坚义博漫画《幽游白书（全19册）》',
    148: '藤子·F·不二雄漫画《机器猫哆啦A梦23》',
    149: '几米绘本《月亮忘記了》',
    150: '云无心科普随笔《吃的真相》，条目目录缺失',
    152: '儒勒·凡尔纳冒险小说《神秘岛（全三册）》',
    153: '余光中诗歌选集《余光中詩選》',
    154: 'J.K.罗琳奇幻小说《哈利·波特与火焰杯》',
    155: '泰戈尔儿童诗集《新月集》',
    156: '泰戈尔诗歌选集《泰戈尔诗选》',
    158: '金庸武侠小说《鹿鼎记》',
    159: '金庸武侠小说《天龙八部》',
    160: '韩寒青春小说《三重门》',
    161: '刘墉人生感悟故事《你不可不知的人性》，条目目录缺失',
    162: '刘墉人生经验杂谈《我不是教你诈》，条目目录缺失',
    163: '电子技术入门基础《电子设计从零开始》，条目目录缺失',
    164: '奚恺元行为决策通俗读物《别做正常的傻瓜》，条目目录缺失',
    165: '唐纳德·诺曼《设计心理学》，与第23本同书重复收录，予以剔除',
    166: '张亮《细节决定交互设计的成败》，条目目录缺失，材料不充分',
    170: '李海鹏专栏杂文结集《佛祖在一号线》，条目目录缺失',
    # Duplicates from Domain 1-7
    72: '李允鉌《华夏意匠》，与建筑学领域第51本完全重合，去重剔除',
    74: '钱穆《中国历代政治得失》，与中国历史领域第41本完全重合，去重剔除',
    87: '费孝通《乡土中国》，与中国历史领域第42本完全重合，去重剔除',
    # Fiction short stories / personal essay collections
    83: '陈春成短篇奇幻小说集《夜晚的潜水艇》，虚构文学情节',
    140: '龙应台散文集《目送》，感性散文作品非体系化论著',
    169: '刘瑜博客生活随笔集《送你一颗子弹》，非体系化论著'
}

# Grouping
batch1_books = [] # 1-20
batch2_books = [] # 21-40
batch3_books = [] # 41-70
batch4_books = [] # curator books (accepted)
rejected_summary = []

for b in books:
    bid = b['id']
    info = gt.get(str(bid), {})
    toc = info.get('toc', [])
    intro = info.get('official_intro', '')

    if bid <= 20:
        batch1_books.append({
            'book': b,
            'ground_truth_toc': toc,
            'official_intro': intro
        })
    elif bid <= 40:
        batch2_books.append({
            'book': b,
            'ground_truth_toc': toc,
            'official_intro': intro
        })
    elif bid <= 70:
        batch3_books.append({
            'book': b,
            'ground_truth_toc': toc,
            'official_intro': intro
        })
    else:
        # Curator books (71-170)
        if bid in reject_reasons:
            rejected_summary.append({
                'id': bid,
                'title': b['title'],
                'author': b['author'],
                'reason': reject_reasons[bid]
            })
        else:
            batch4_books.append({
                'book': b,
                'ground_truth_toc': toc,
                'official_intro': intro
            })

with open(os.path.join(DATA_DIR, 'audit_batch_1.json'), 'w', encoding='utf-8') as f:
    json.dump(batch1_books, f, ensure_ascii=False, indent=2)

with open(os.path.join(DATA_DIR, 'audit_batch_2.json'), 'w', encoding='utf-8') as f:
    json.dump(batch2_books, f, ensure_ascii=False, indent=2)

with open(os.path.join(DATA_DIR, 'audit_batch_3.json'), 'w', encoding='utf-8') as f:
    json.dump(batch3_books, f, ensure_ascii=False, indent=2)

with open(os.path.join(DATA_DIR, 'audit_batch_4.json'), 'w', encoding='utf-8') as f:
    json.dump(batch4_books, f, ensure_ascii=False, indent=2)

with open(os.path.join(DATA_DIR, 'audit_rejected_books.json'), 'w', encoding='utf-8') as f:
    json.dump(rejected_summary, f, ensure_ascii=False, indent=2)

print(f"Batch 1 (Books 1-20: 软件工程 & 系统设计): {len(batch1_books)} books")
print(f"Batch 2 (Books 21-40: UI/UX & 产品经理): {len(batch2_books)} books")
print(f"Batch 3 (Books 41-70: 历史、建筑、艺术): {len(batch3_books)} books")
print(f"Batch 4 (Curator Verified: 包括《小家大变局》等): {len(batch4_books)} books")
print(f"Rejected curator books: {len(rejected_summary)} books")
