<p align="right"><a href="README.md">中文</a></p>

<p align="center">
  <img src="./assets/readme/hero.svg" width="100%" alt="Classic Books Guide — 921 highly-rated classics on Douban: the big idea, core arguments, full structure; three books: The Mythical Man-Month 8.4, Peopleware 8.2, Code Complete 9.3">
</p>

<p align="center">
  <a href="https://xiaosang.cc/forty-classic-books/">▶ Read Online</a>
  ·
  <a href="https://holynova.github.io/forty-classic-books/">GitHub Pages Mirror</a>
  ·
  <a href="https://github.com/holynova/forty-classic-books">GitHub Repository</a>
</p>

Classic Books Guide covers 921 highly-rated classics on Douban across 10 domains. Each book gets three things: the big idea, the core arguments (with real examples), and the full chapter structure — matched against the book's actual table of contents, no filler. A dependency-free static site with full-text search and want-to-read / finished tracking.

## Screenshot

<p align="center">
  <img src="./assets/readme/screenshot.png" width="100%" alt="Homepage: Classic Books Guide title, search box, 10 domain category tags, with The Mythical Man-Month 8.4 and Peopleware 8.2 under Software Engineering">
</p>

## What's Inside

10 domains, 921 books:

| Domain | About |
| --- | --- |
| 软件工程 (Software Engineering) | Methodology classics on writing code, leading teams, and doing engineering |
| 系统设计 (System Design) | Design classics on architecture, distributed systems, and high availability |
| UI/UX 设计 (UI/UX Design) | Design classics on interaction, visual design, and user experience |
| 产品经理 (Product Management) | Hands-on classics on product thinking, requirements, and growth |
| 中国历史 (Chinese History) | Masterworks of general and dynastic history |
| 建筑学 (Architecture) | Classics on architectural history, space, and cities |
| 艺术 (Art) | Introductory and advanced art history and aesthetics |
| 主理人五星精选 (Curator's Five-Star Picks) | Books the curator read and rated five stars |
| 主理人四星精选 (Curator's Four-Star Picks) | Books the curator read and rated four stars |
| 主理人心愿精选 (Curator's Wish List) | Books the curator wants to read |

Each book includes:

- **The big idea**: one sentence on what the book is really about.
- **Core arguments**: with vivid real examples, not piled-up abstractions.
- **Full structure**: chapter-by-chapter breakdowns that match the book's actual table of contents.
- **Douban rating and review count**: both taken from the book's Douban page.

## Features

- **Search everything**: search all 921 books by title, author, publisher, or keyword.
- **Browse by domain**: ten categories with a sticky table of contents for quick jumps.
- **Want to read / finished**: one tap to mark a book; saved in the local browser, still there next time.
- **Navigate between books**: previous/next links on every detail page, plus `←` `→` keyboard shortcuts.
- **Responsive WebP covers**: covers load sized to the device, so phones stay fast.

## Run Locally

Pages are prebuilt — just serve the directory with any static server:

```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

Rebuild all pages and run validation:

```bash
npm run build && npm run validate
```

## Tech

- Pure static site, zero dependencies: prebuilt HTML + CSS + a little JS, no backend.
- Full-site search uses a prebuilt `search-index.json` for instant local retrieval.
- Covers are responsive WebP images; off-screen content renders lazily.
