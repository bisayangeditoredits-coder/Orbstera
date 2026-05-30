const fs = require('fs');
const path = require('path');
function walk(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (fullPath.endsWith('.js')) {
        let content = fs.readFileSync(fullPath, 'utf8');
        const target = 'Maximum update depth exceeded';
        if (content.includes(target) && !content.includes('MAXIMUM UPDATE DEPTH EXCEEDED IN COMPONENT')) {
          const replacePattern = /(throw [a-zA-Z_0-9$]+\(Error\(\"Maximum update depth exceeded[^\"]+\"\)\);?|throw new Error\(\"Maximum update depth exceeded[^\"]+\"\);?)/g;
          const newContent = content.replace(replacePattern, (match) => {
            console.log('Patched match in', fullPath);
            return 'console.error("MAXIMUM UPDATE DEPTH EXCEEDED IN COMPONENT:", typeof workInProgress !== "undefined" && workInProgress !== null ? (workInProgress.type && workInProgress.type.name ? workInProgress.type.name : (typeof workInProgress.type === "string" ? workInProgress.type : "Unknown")) : "Unknown"); ' + match;
          });
          if (newContent !== content) {
            fs.writeFileSync(fullPath, newContent);
          }
        }
      }
    }
  } catch(e) {}
}
walk('node_modules/next/dist');
walk('node_modules/react-dom');
console.log('Done');
