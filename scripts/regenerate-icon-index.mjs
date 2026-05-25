import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GEN = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/components/icons/generated');
const files = fs.readdirSync(GEN).filter((f) => f.endsWith('.tsx'));
const names = files
  .map((f) => {
    const c = fs.readFileSync(path.join(GEN, f), 'utf8');
    return c.match(/export function Icon(\w+)/)?.[1];
  })
  .filter(Boolean)
  .sort();
const pascalToFile = (n) => n.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
const lines = names.map((n) => `export { Icon${n} } from './${pascalToFile(n)}';`);
fs.writeFileSync(path.join(GEN, 'index.ts'), `/** Auto-generated */\n${lines.join('\n')}\n`);
console.log(names.length);
