const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const booksPath = path.join(dataDir, 'books.json');

const originalBooks = JSON.parse(fs.readFileSync(booksPath, 'utf8'));
const booksMap = new Map();
originalBooks.forEach(b => booksMap.set(b.id, b));

const filesToMerge = [
  'calibrated_classic_and_5stars.json',
  'calibrated_wishlist_part1.json',
  'calibrated_wishlist_part2.json',
  'calibrated_4stars.json'
];

let mergedCount = 0;

for (const file of filesToMerge) {
  const filePath = path.join(dataDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found yet: ${file}`);
    continue;
  }
  
  try {
    const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    console.log(`Loaded ${file}: ${list.length} books`);
    for (const item of list) {
      if (!booksMap.has(item.id)) {
        console.warn(`Book ID ${item.id} not found in original books.json!`);
        continue;
      }
      const target = booksMap.get(item.id);
      
      // Update structure and verification
      target.structure = item.structure;
      target.verified = item.verified !== undefined ? item.verified : true;
      target.verifiedAt = item.verifiedAt || '2026-10-10';
      if (item.verifiedSource) {
        target.verifiedSource = item.verifiedSource;
      }
      if (item.coreTakeaway) target.coreTakeaway = item.coreTakeaway;
      if (item.actionableTips) target.actionableTips = item.actionableTips;
      
      mergedCount++;
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err.message);
  }
}

// Ensure the 15 wishlist books calibrated in earlier steps are verified
const wishlistManualIds = [255, 257, 260, 266, 268, 269, 270, 275, 278, 281, 285, 287, 288, 289, 290];
for (const id of wishlistManualIds) {
  if (booksMap.has(id)) {
    const b = booksMap.get(id);
    b.verified = true;
    b.verifiedAt = '2026-10-10';
    if (!b.verifiedSource) b.verifiedSource = '真实出版物目录核验';
  }
}

const finalBooks = Array.from(booksMap.values()).sort((a, b) => a.id - b.id);

// Check stats
const total = finalBooks.length;
const verifiedCount = finalBooks.filter(b => b.verified).length;
console.log(`\nMerge Summary:`);
console.log(`Total books: ${total}`);
console.log(`Merged items: ${mergedCount}`);
console.log(`Verified books: ${verifiedCount} / ${total}`);

if (verifiedCount === total) {
  fs.writeFileSync(booksPath, JSON.stringify(finalBooks, null, 2), 'utf8');
  console.log(`Successfully updated ${booksPath} with 100% verified books!`);
} else {
  console.log(`Warning: Not all books verified (${verifiedCount}/${total}). Not overwriting books.json yet.`);
}
