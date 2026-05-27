const fs = require('fs');
const path = require('path');

const MAPPINGS = {
  'ðŸ‡ºðŸ‡¸': '🇺🇸',
  'ðŸ‡¬ðŸ‡§': '🇬🇧',
  'ðŸ‡¸ðŸ‡¬': '🇸🇬',
  'ðŸ‡ªðŸ‡¸': '🇪🇸',
  'ðŸ‡«ðŸ‡·': '🇫🇷',
  'ðŸ‡©ðŸ‡ª': '🇩🇪',
  'ðŸ‡¯ðŸ‡µ': '🇯🇵',
  'ðŸ‡¨ðŸ‡³': '🇨🇳',
  'ðŸ‡°ðŸ‡·': '🇰🇷',
  'ðŸ‡§ðŸ‡·': '🇧🇷',
  'ðŸ‡¸ðŸ‡¦': '🇸🇦',
  'ðŸ‡®ðŸ‡¹': '🇮🇹',
  'ðŸ‡·ðŸ‡º': '🇷🇺',
  'ðŸš€': '🚀',
  'ðŸ“Š': '📊',
  'ðŸŽ“': '🎓',
  'ðŸŽ¨': '🎨',
  'ðŸ“ˆ': '📈',
  'ðŸ”¬': '🔬',
  'ðŸŽ¤': '🎤',
  'ðŸ“ ': '📍',
  'ðŸ–¼ï¸ ': '🖼️',
  'ðŸŒ…': '🌅',
  'ðŸ“‹': '📋',
  'ðŸ”“': '🔓',
  'ðŸ”’': '🔒',
  'ðŸ—ºï¸ ': '🗺️',
  'ðŸ›°ï¸ ': '🛰️',
  'ðŸ ”ï¸ ': '🏔️',
  'ðŸ”€': '🔀',
  'ðŸ’¬': '💬',
  'ðŸ¥§': '🥧',
  'ðŸ“…': '📅',
  'ðŸ§ ': '🧠',
  'ðŸ—ƒï¸ ': '🗃️',
  'ðŸ‡µðŸ‡­': '🇵🇭',
  'Â·': '·',
  'Ã‚Â·': '·',
  'Ã—': '×',
  'EspaÃ±ol': 'Español',
  'FranÃ§ais': 'Français'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  for (const [bad, good] of Object.entries(MAPPINGS)) {
    content = content.split(bad).join(good);
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Fixed: ${file}`);
    changedCount++;
  }
});

console.log(`Fixed ${changedCount} files.`);
