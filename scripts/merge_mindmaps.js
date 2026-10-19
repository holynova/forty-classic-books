const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const parts = [
  'mindmaps_part1.json',
  'mindmaps_part2.json',
  'mindmaps_part3.json',
  'mindmaps_part4.json'
];

const merged = {};

for (const part of parts) {
  const filePath = path.join(DATA_DIR, part);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing file: ${filePath}`);
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const [key, val] of Object.entries(data)) {
    merged[key] = val;
  }
}

const keys = Object.keys(merged).map(Number).sort((a, b) => a - b);
console.log(`Merged ${keys.length} books mindmaps: [${keys.join(', ')}]`);

// Basic validation
for (let i = 1; i <= 20; i++) {
  if (!merged[i]) {
    console.error(`Book ${i} is missing from mindmaps!`);
    process.exit(1);
  }
  const mm = merged[i];
  if (!mm.id || !mm.title || !mm.branches || !Array.isArray(mm.branches)) {
    console.error(`Book ${i} has invalid mindmap structure!`);
    process.exit(1);
  }
  for (const branch of mm.branches) {
    if (!branch.name || !branch.topics || !Array.isArray(branch.topics)) {
      console.error(`Book ${i} branch ${branch.name} invalid!`);
      process.exit(1);
    }
    for (const topic of branch.topics) {
      if (!topic.title || !topic.points || !Array.isArray(topic.points)) {
        console.error(`Book ${i} topic ${topic.title} invalid!`);
        process.exit(1);
      }
    }
  }
}

const targetPath = path.join(DATA_DIR, 'mindmaps.json');
fs.writeFileSync(targetPath, JSON.stringify(merged, null, 2), 'utf-8');
console.log(`✓ Successfully created ${targetPath} with 20 books!`);
