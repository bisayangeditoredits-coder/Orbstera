/**
 * Extended Streamline fetch — material-pro-rounded-line-free
 * STREAMLINE_API_KEY=... node scripts/fetch-streamline-extended.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../src/components/icons/generated');
const API = 'https://public-api.streamlinehq.com/v1';
const FAMILY = 'material-pro-rounded-line-free';

const ICON_QUERIES = {
  ArrowRight: 'arrow right',
  ArrowUpRight: 'arrow up right',
  ArrowDownRight: 'arrow down right',
  ArrowUp: 'arrow up',
  ArrowDown: 'arrow down',
  Check: 'check',
  Mail: 'mail email',
  Phone: 'phone',
  MapPin: 'map pin location',
  Globe: 'globe world',
  Monitor: 'monitor desktop',
  Smartphone: 'smartphone mobile',
  Laptop: 'laptop computer',
  Tablet: 'tablet',
  Users: 'users group',
  Shield: 'shield security',
  Activity: 'activity pulse',
  TrendingUp: 'trending up chart',
  Home: 'home house',
  History: 'history clock',
  MoreHorizontal: 'more horizontal dots',
  MessageSquare: 'message chat',
  Building2: 'building office',
  Save: 'save disk',
  Lock: 'lock',
  Unlock: 'unlock',
  Paintbrush: 'paint brush',
  Pipette: 'color picker dropper',
  Maximize2: 'maximize expand',
  Minimize2: 'minimize',
  ImagePlus: 'add image',
  Columns: 'columns layout',
  LayoutList: 'list layout',
  ZoomIn: 'zoom in',
  ZoomOut: 'zoom out',
  Wifi: 'wifi',
  Terminal: 'terminal code',
  ShieldCheck: 'shield check verified',
  LogOut: 'logout sign out',
  Menu: 'menu hamburger',
  AlertTriangle: 'warning triangle',
  MessageCircle: 'help question',
  Target: 'target goal',
  Lightbulb: 'lightbulb idea',
  Network: 'network nodes',
  Calendar: 'calendar',
  User: 'user person',
  Briefcase: 'briefcase business',
  Eye: 'eye view',
  EyeOff: 'eye off hide',
  Bold: 'bold text',
  Italic: 'italic text',
  Underline: 'underline text',
  Strikethrough: 'strikethrough',
  AlignCenter: 'align center',
  AlignRight: 'align right',
  AlignJustify: 'align justify',
  AlignStartHorizontal: 'align left',
  AlignCenterHorizontal: 'align center horizontal',
  AlignEndHorizontal: 'align right',
  AlignStartVertical: 'align top',
  AlignCenterVertical: 'align middle vertical',
  AlignEndVertical: 'align bottom',
  Pause: 'pause',
  Presentation: 'presentation screen',
  FlaskConical: 'science flask',
  RotateCcw: 'rotate counterclockwise',
  Move: 'move drag',
  LogOut: 'logout',
  LayoutDashboard: 'dashboard grid',
  Youtube: 'youtube play',
  BadgeCheck: 'verified badge check',
  ScanIcon: 'scan search',
  GripVertical: 'drag handle',
  ChevronUp: 'chevron up',
  FileImage: 'file image',
  LogIn: 'login',
  CreditCard: 'credit card',
  Bell: 'bell notification',
  HelpCircle: 'help circle',
  ExternalLink: 'external link',
  Filter: 'filter',
  SortAsc: 'sort ascending',
  DownloadCloud: 'cloud download',
  Send: 'send',
  Paperclip: 'attachment',
  FolderOpen: 'folder open',
  SlidersHorizontal: 'sliders settings',
  Volume2: 'volume speaker',
  VolumeX: 'volume mute',
  Maximize: 'fullscreen',
  Minimize: 'exit fullscreen',
  SkipForward: 'skip forward',
  SkipBack: 'skip back',
  Repeat: 'repeat',
  Shuffle: 'shuffle',
  Sun: 'sun light',
  Moon: 'moon dark',
  ZapOff: 'zap off',
};

function pascalToFile(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

async function searchIcon(query, apiKey) {
  const url = new URL(`${API}/search/global`);
  url.searchParams.set('query', query);
  url.searchParams.set('productType', 'icons');
  url.searchParams.set('limit', '20');
  const res = await fetch(url, { headers: { 'x-api-key': apiKey } });
  if (!res.ok) return null;
  const data = await res.json();
  return (
    data.results?.find((r) => r.isFree && r.familySlug === FAMILY) ??
    data.results?.find((r) => r.isFree && r.familySlug?.includes('rounded-line-free')) ??
    data.results?.find((r) => r.isFree) ??
    null
  );
}

async function downloadSvg(hash, apiKey) {
  const res = await fetch(`${API}/icons/${hash}/download/svg?responsive=true`, {
    headers: { 'x-api-key': apiKey, accept: 'image/svg+xml' },
  });
  if (!res.ok) return null;
  return res.text();
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
  if (!apiKey) {
    console.error('Set STREAMLINE_API_KEY');
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const existing = new Set(
    fs.existsSync(OUT_DIR)
      ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.tsx')).map((f) => f.replace('.tsx', ''))
      : [],
  );
  let added = 0;
  for (const [name, query] of Object.entries(ICON_QUERIES)) {
    const fileKey = pascalToFile(name);
    if (existing.has(fileKey)) continue;
    try {
      const hit = await searchIcon(query, apiKey);
      if (!hit) {
        console.log('MISS', name);
        continue;
      }
      const svg = await downloadSvg(hit.hash, apiKey);
      if (!svg) {
        console.log('DLFAIL', name);
        continue;
      }
      writeComponent(name, svgToPaths(svg));
      console.log('OK', name);
      added++;
      await new Promise((r) => setTimeout(r, 180));
    } catch (e) {
      console.log('ERR', name, e.message);
    }
  }
  const files = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.tsx'));
  const names = files
    .map((f) => {
      const m = fs.readFileSync(path.join(OUT_DIR, f), 'utf8').match(/export function Icon(\w+)/);
      return m?.[1];
    })
    .filter(Boolean);
  const indexTs =
    `/** Auto-generated — Streamline icons (offline) */\n${names.map((n) => `export { Icon${n} } from './${pascalToFile(n)}';`).join('\n')}\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.ts'), indexTs);
  console.log(`\nAdded ${added}, total ${names.length} icons`);
}

main();
