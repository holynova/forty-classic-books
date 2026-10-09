# 四十本经典书 · 导读网站

> 软件工程 · 系统设计 · UI/UX 设计 · 产品经理 4 个领域 × 10 本 = 40 本经典书导读。
> 纯静态网站，原生 HTML/CSS/JS，即开即用，直接部署于 GitHub Pages。

- **线上访问**：[https://holynova.github.io/forty-classic-books/](https://holynova.github.io/forty-classic-books/)

---

## 项目特性

- **经典书目精选**：4 大核心研发领域，严格核实自豆瓣高分且久负盛名的经典著作（每领域恰好 10 本）。
- **纯干货说人话**：每本书均包含「一句话导读」、「总体观点（2-4 段）」、「5-8 个核心观点（带生动实际例子）」以及「全书结构（带例子）」。剔除一切无意义客套与垫话，直击本质。
- **豆瓣风精致排版**：
  - 以经典豆瓣绿（`#007722`）为点缀，搭配精美衬线书名与现代无衬线阅读正文。
  - 40 张豆瓣高清封面全部本地化（`covers/`），绝不盗链。
  - 首页支持**吸顶主题导航**（带平滑滚动与 Scrollspy 高亮）以及**全局即时极速搜索**（书名、作者、出版社、关键词毫秒级过滤）。
  - 书籍详情页豆瓣式信息架构：大字评分、星级可视化、评价人数、引用式导读、左右翻页与目录回跳。
- **数据驱动静态架构**：单数据源（`data/books.json`）驱动，通过极简构建脚本生成 40 个原生详情页与主页，不依赖任何重型前端打包器或外部运行时。

---

## 目录结构

```text
forty-classic-books/
├── data/
│   ├── books.json        # 40 本书全部结构化数据源（唯一真实来源）
│   └── site.json         # 网站全局元信息与领域分类描述
├── scripts/
│   ├── build.js          # 静态 HTML 页面构建脚本
│   └── validate.js       # 需求验收规则自动化校验脚本
├── covers/               # 40 张本地封面图像（s*.jpg）
├── style.css             # 提取统一的豆瓣风排版样式系统
├── index.html            # 导读网站首页（含吸顶导航与实时搜索）
├── book-01.html ~ book-40.html # 40 个书籍详情页
└── package.json          # 快捷命令配置
```

---

## 本地维护与构建

本站点完全基于纯静态设计，无需安装庞大的 `node_modules` 依赖：

### 1. 构建全部静态页面

```bash
# 生成 index.html 和 book-01.html ~ book-40.html
npm run build
# 或直接运行
node scripts/build.js
```

### 2. 执行自动化验收检查

严格检查全量 40 本书的数据完整性、段落规范、例子完备性、封面存在性与路由跳转：

```bash
npm run validate
# 或直接运行
node scripts/validate.js
```

### 3. 本地预览

直接双击打开 `index.html`，或使用任意本地静态服务器：

```bash
npx serve .
# 或
python3 -m http.server 8000
```

---

## 部署

推送代码至 `main` 分支根目录，GitHub Pages 即可自动实时发布。
