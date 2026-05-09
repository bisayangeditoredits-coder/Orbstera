const fs = require('fs');
const p = require('path');
function f(d) {
  fs.readdirSync(d).forEach(x => {
    const n = p.join(d, x);
    if(fs.statSync(n).isDirectory()) {
      f(n);
    } else if(n.endsWith('.ts') || n.endsWith('.tsx')) {
      let c = fs.readFileSync(n, 'utf8');
      c = c.replace(/\\\\\\$/g, '$');
      c = c.replace(/\\\\\\`/g, '\`');
      c = c.replace(/\\\\s/g, '\\s');
      fs.writeFileSync(n, c);
    }
  });
}
f('src');
