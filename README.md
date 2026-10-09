# Forty Classic Books / 经典书导读 (70 本经典书)

中文：精选软件工程、系统设计、UI/UX 设计、产品经理、中国历史、建筑学、艺术 7 大核心领域各 10 本豆瓣高分经典，共 70 本书深度导读。每本书包含总体观点、5-8 个核心观点（配实际生动案例）与全书结构剖析，坚持纯干货、说人话。纯静态网页，内置全局搜索、吸顶目录与沉浸式默认隐藏侧边导航抽屉。

English: Curated reading guide for 70 classic books across 7 core domains: Software Engineering, System Design, UI/UX Design, Product Management, Chinese History, Architecture, and Art (10 books per domain). Each book features core concepts with real-world examples and structured outlines. Zero-dependency static site with instant search and distraction-free collapsible navigation.

![Project screenshot](./assets/screenshot.png)

## 在线体验 / Live Demo

- [Cloudflare Demo](https://xiaosang.cc/forty-classic-books/)
- [GitHub Pages](https://holynova.github.io/forty-classic-books/)
- [GitHub Repo](https://github.com/holynova/forty-classic-books)

<img src="./assets/qr.png" width="180" alt="扫码访问 Cloudflare 在线体验">

## 本地运行 / Run locally

```bash
# 生成全部静态页面并执行验收
npm run build && npm run validate
# 或
node scripts/build.js && node scripts/validate.js
```

## 发布 / Deploy

```bash
npx wrangler deploy --config wrangler.jsonc
```

Cloudflare Workers · Route: `xiaosang.cc/forty-classic-books/*`

源码与部署配置使用同一个主分支；在本地手动发布，不创建 Cloudflare 专用分支或 GitHub Action。
