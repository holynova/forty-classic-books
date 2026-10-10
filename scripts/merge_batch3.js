const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const booksPath = path.join(DATA_DIR, 'books.json');
const sitePath = path.join(DATA_DIR, 'site.json');
const batchPath = path.join(DATA_DIR, 'batch3_30_audited.json');

const currentBooks = JSON.parse(fs.readFileSync(booksPath, 'utf-8'));
const site = JSON.parse(fs.readFileSync(sitePath, 'utf-8'));
const batch30 = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));

// 1. Assign sequential IDs (341 to 370) and correct domainOrder
batch30.forEach((b, i) => {
  b.id = 341 + i;
  b.slug = 'book-' + b.id;
  b.domainOrder = '第 ' + (131 + i) + ' 本';
  b.domain = '主理人四星精选';
  b.verified = true;
});

// 2. Find position of the last Domain 9 book
const lastD9Idx = currentBooks.findLastIndex(b => b.domain === '主理人四星精选');
if (lastD9Idx === -1) {
  throw new Error('Domain 9 not found in books.json');
}

const mergedBooks = [
  ...currentBooks.slice(0, lastD9Idx + 1),
  ...batch30,
  ...currentBooks.slice(lastD9Idx + 1)
];

console.log(`Merged books: ${currentBooks.length} -> ${mergedBooks.length}`);

// 3. Update site.json
site.title = `经典书导读 · 10 大领域 · ${mergedBooks.length} 本严选非虚构经典`;
site.brandSub = `CLASSIC BOOKS · ${mergedBooks.length} MASTERPIECES`;
site.heroTag = `10 大领域 · ${mergedBooks.length} 本严选 · 章节对齐原书目录`;

const dom9 = site.domains.find(d => d.name === '主理人四星精选');
if (dom9) {
  dom9.count = '160 本';
}

fs.writeFileSync(booksPath, JSON.stringify(mergedBooks, null, 2), 'utf-8');
fs.writeFileSync(sitePath, JSON.stringify(site, null, 2), 'utf-8');

console.log('Successfully updated books.json and site.json for Batch 3!');
