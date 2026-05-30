const fs = require('fs');
let code = fs.readFileSync('src/lib/export/run-pptx-export.ts', 'utf8').replace(/\r\n/g, '\n');

const t = '<p:par><p:cTn id="${a}" fill="hold">';
const r = '<p:par><p:cTn id="${a}" fill="hold" nodeType="withEffect">';

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/lib/export/run-pptx-export.ts', code);
  console.log('Fixed video autoplay by adding nodeType="withEffect"!');
} else {
  console.log('Target not found.');
}
