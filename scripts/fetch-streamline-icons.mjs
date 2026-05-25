/**
 * ONE-TIME dev script — fetches SVGs from Streamline API and writes React components.
 * Usage: STREAMLINE_API_KEY=your.key node scripts/fetch-streamline-icons.mjs
 * Do NOT commit API keys. Output goes to src/components/icons/generated/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../src/components/icons/generated');
const API = 'https://public-api.streamlinehq.com/v1';
const FAMILY = 'material-pro-rounded-line-free';

/** name -> search query */
const ICON_QUERIES = {
  LayoutTemplate: 'layout template',
  Sparkles: 'sparkle',
  MousePointer: 'cursor select',
  Type: 'text',
  Upload: 'upload',
  Layers: 'layers',
  Wand: 'magic wand',
  StickyNote: 'note',
  Grid: 'grid',
  ArrowLeft: 'arrow left',
  Play: 'play',
  Download: 'download',
  Share: 'share',
  FileText: 'document',
  CheckCircle: 'check circle',
  Pencil: 'pencil edit',
  X: 'close',
  Undo: 'undo',
  Redo: 'redo',
  FileDown: 'file download',
  Package: 'package',
  Clock: 'clock',
  AlignLeft: 'align left',
  Palette: 'palette color',
  AlertCircle: 'alert',
  RefreshCw: 'refresh',
  PanelLeft: 'sidebar panel',
  Square: 'square shape',
  Image: 'image photo',
  Minus: 'line horizontal',
  Shapes: 'shapes',
  Smile: 'smile emoji',
  Clapperboard: 'video movie',
  BookOpen: 'book',
  SpellCheck: 'spell check',
  Layout: 'layout',
  LayoutGrid: 'grid layout',
  BarChart: 'bar chart',
  GitBranch: 'diagram branch',
  Map: 'map',
  QrCode: 'qr code',
  Star: 'star',
  Plus: 'plus add',
  ChevronLeft: 'chevron left',
  ChevronRight: 'chevron right',
  ChevronDown: 'chevron down',
  Search: 'search',
  Loader: 'loading',
  Trash: 'trash delete',
  Copy: 'copy',
  Info: 'information',
  Zap: 'lightning',
  Settings: 'settings gear',
  UserCircle: 'user profile',
  Flag: 'flag',
  Video: 'video',
  Link: 'link',
  Crown: 'crown premium',
  Mic: 'microphone',
  Triangle: 'triangle',
  Heart: 'heart',
  Diamond: 'diamond',
  Circle: 'circle',
};

function pascalToFile(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function searchIcon(query, apiKey) {
  const url = new URL(`${API}/search/global`);
  url.searchParams.set('query', query);
  url.searchParams.set('productType', 'icons');
  url.searchParams.set('limit', '15');
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) throw new Error(`search failed ${res.status} ${query}`);
  const data = await res.json();
  const hit =
    data.results?.find((r) => r.isFree && r.familySlug === FAMILY) ??
    data.results?.find((r) => r.isFree && r.familySlug?.includes('rounded-line-free')) ??
    data.results?.find((r) => r.isFree);
  return hit ?? null;
}

async function downloadSvg(hash, apiKey) {
  const url = `${API}/icons/${hash}/download/svg?responsive=true`;
  const res = await fetch(url, {
    headers: { 'x-api-key': apiKey, accept: 'image/svg+xml' },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`download ${hash}: ${res.status} ${err.slice(0, 120)}`);
  }
  return res.text();
}

function svgToPaths(svg) {
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"[^>]*\/?>/gi)].map((m) => m[1]);
  if (paths.length === 0) throw new Error('no paths in svg');
  return paths;
}

function writeComponent(name, paths) {
  const file = path.join(OUT_DIR, `${pascalToFile(name)}.tsx`);
  const pathsJsx = paths
    .map(
      (d) =>
        `    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d={${JSON.stringify(d)}} />`,
    )
    .join('\n');
  const content = `/** Streamline Material Rounded Line (free) — offline, do not fetch at runtime */\nimport { OrbsteraIcon, type OrbsteraIconProps } from '../Icon';\n\nexport function Icon${name}(props: OrbsteraIconProps) {\n  return (\n    <OrbsteraIcon viewBox="0 0 24 24" {...props}>\n${pathsJsx}\n    </OrbsteraIcon>\n  );\n}\n`;
  fs.writeFileSync(file, content);
}

async function main() {
  const apiKey = process.env.STREAMLINE_API_KEY?.trim();
  if (!apiKey) {
    console.error('Set STREAMLINE_API_KEY (from Streamline dashboard, not committed)');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const index = [];
  const failed = [];

  for (const [name, query] of Object.entries(ICON_QUERIES)) {
    try {
      process.stdout.write(`… ${name} (${query}) `);
      const hit = await searchIcon(query, apiKey);
      if (!hit) {
        failed.push(name);
        console.log('MISS');
        continue;
      }
      const svg = await downloadSvg(hit.hash, apiKey);
      const paths = svgToPaths(svg);
      writeComponent(name, paths);
      index.push({ name, hash: hit.hash, query, paths: paths.length });
      console.log(`OK ${hit.name}`);
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      failed.push(name);
      console.log('ERR', e.message);
    }
  }

  const indexTs = `/** Auto-generated — run scripts/fetch-streamline-icons.mjs to refresh */\n${index.map((i) => `export { Icon${i.name} } from './${pascalToFile(i.name)}';`).join('\n')}\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexTs);
  fs.writeFileSync(
    path.join(OUT_DIR, 'manifest.json'),
    JSON.stringify({ family: FAMILY, icons: index, failed }, null, 2),
  );
  console.log(`\nDone: ${index.length} icons, ${failed.length} failed`, failed);
}

main();
