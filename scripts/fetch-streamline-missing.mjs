/** Supplement missing icons by hash — STREAMLINE_API_KEY required */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../src/components/icons/generated');
const API = 'https://public-api.streamlinehq.com/v1';

const BY_NAME = {
  MousePointer: 'ico_7qLdLf9nMaZyPwNg',
  Grid: 'ico_TmRIaTXtLYmDLDNd',
  ArrowLeft: 'ico_4ZxKc3L0AcNLslTL',
  CheckCircle: 'ico_NekyDfa9CE5EEFas',
  X: 'ico_wXHKUZXwAWyTfu9r',
  Package: 'ico_vGTLwpPAeb07kCFZ',
  Square: 'ico_8GgGtiz3gdzqZVml',
  Minus: 'ico_OPpyKHFCbQ7Niyqd',
  BookOpen: 'ico_XfL5Uq1e3WgdocPf',
  SpellCheck: 'ico_dazQpU734ppr9xkW',
  GitBranch: 'ico_d2CiUnz2gckpkrgp',
  Plus: 'ico_HO1NTzwHHAi6nKM8',
  Loader: 'ico_AbI6U6z7QfltL0Dr',
  Trash: 'ico_Yq5C68vBYG8bRWzO',
  Triangle: 'ico_Mv0VAI1dB8ooJ3Y4',
  Image: 'ico_zHrTPOJ5Fg66OQ3r',
  Redo: 'ico_DGDWdfO26vcfVJXs',
  PanelLeft: 'ico_mInI3VElmvY8lukb',
};

function pascalToFile(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function svgToPaths(svg) {
  return [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*\/?>/gi)].map((m) => m[1]);
}

function writeComponent(name, paths) {
  const file = path.join(OUT_DIR, `${pascalToFile(name)}.tsx`);
  const pathsJsx = paths
    .map(
      (d) =>
        `    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={${JSON.stringify(d)}} />`,
    )
    .join('\n');
  fs.writeFileSync(
    file,
    `/** Streamline Material Rounded Line (free) */\nimport { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';\n\nexport function Icon${name}(props: OrbsteraIconProps) {\n  return (\n    <OrbsteraIcon viewBox="0 0 24 24" {...props}>\n${pathsJsx}\n    </OrbsteraIcon>\n  );\n}\n`,
  );
}

async function main() {
  const apiKey = process.env.STREAMLINE_API_KEY?.trim();
  if (!apiKey) process.exit(1);
  for (const [name, hash] of Object.entries(BY_NAME)) {
    const url = `${API}/icons/${hash}/download/svg?responsive=true`;
    const res = await fetch(url, { headers: { 'x-api-key': apiKey, accept: 'image/svg+xml' } });
    if (!res.ok) {
      console.log('FAIL', name, await res.text());
      continue;
    }
    const svg = await res.text();
    writeComponent(name, svgToPaths(svg));
    console.log('OK', name);
  }
  // rebuild index
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.tsx'));
  const names = files.map((f) => {
    const m = fs.readFileSync(path.join(OUT_DIR, f), 'utf8').match(/export function Icon(\w+)/);
    return m?.[1];
  }).filter(Boolean);
  const indexTs = names.map((n) => `export { Icon${n} } from './${pascalToFile(n)}';`).join('\n') + '\n';
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), `/** Auto-generated */\n${indexTs}`);
}

main();
