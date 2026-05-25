/**
 * Generates src/components/icons/lucide.tsx from generated/ + alias map
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GEN = path.join(__dirname, '../src/components/icons/generated');
const OUT = path.join(__dirname, '../src/components/icons/lucide.tsx');

const files = fs.readdirSync(GEN).filter((f) => f.endsWith('.tsx'));
const icons = files.map((f) => {
  const content = fs.readFileSync(path.join(GEN, f), 'utf8');
  const m = content.match(/export function Icon(\w+)/);
  return m?.[1];
}).filter(Boolean);

/** Lucide export name -> generated Icon name */
const ALIASES = {
  Undo2: 'Undo',
  Redo2: 'Redo',
  Share2: 'Share',
  Loader2: 'Loader',
  PackageCheck: 'Package',
  MousePointer2: 'MousePointer',
  Wand2: 'Wand',
  Grid3x3: 'Grid',
  Grid3X3: 'Grid',
  ImageIcon: 'Image',
  CheckCircle2: 'CheckCircle',
  LinkIcon: 'Link',
  ScanIcon: 'ScanIcon',
  BarChart2: 'BarChart',
  BarChart3: 'BarChart',
  Clock3: 'Clock',
  ChevronUp: 'ChevronUp',
  GripVertical: 'GripVertical',
  MessageSquareText: 'MessageSquare',
  MessageCircleQuestion: 'MessageCircle',
  StickyNote: 'StickyNote',
  LayoutTemplate: 'LayoutTemplate',
  UserCircle2: 'UserCircle',
  Video: 'Video',
  Youtube: 'Youtube',
  ArrowDownRight: 'ArrowDown',
  Users: 'User',
  Lock: 'Shield',
  Columns: 'LayoutGrid',
  Menu: 'SlidersHorizontal',
  Bold: 'Bold',
  Italic: 'Italic',
  Underline: 'Underline',
  Strikethrough: 'Strikethrough',
  Lock: 'Lock',
  Users: 'Users',
  Columns: 'Columns',
  Menu: 'Menu',
  AlignCenterHorizontal: 'AlignCenterHorizontal',
  AlignStartVertical: 'AlignStartVertical',
  AlignCenterVertical: 'AlignCenterVertical',
  AlignEndVertical: 'AlignEndVertical',
  ArrowDownRight: 'ArrowDownRight',
  AlignCenterHorizontal: 'AlignCenter',
  AlignStartVertical: 'AlignStartHorizontal',
  AlignCenterVertical: 'AlignCenter',
  AlignEndVertical: 'AlignEndHorizontal',
  AlignHorizontalDistributeCenter: 'LayoutGrid',
  AlignVerticalDistributeCenter: 'LayoutList',
  FolderOpen: 'Building2',
  SortAsc: 'ArrowUp',
  FileImage: 'Image',
  LogOut: 'LogOut',
  Clapperboard: 'Clapperboard',
  SpellCheck: 'SpellCheck',
  RefreshCw: 'RefreshCw',
  Maximize2: 'Maximize2',
  Minimize2: 'Minimize2',
  ImagePlus: 'ImagePlus',
  MicOff: 'Mic',
  ZapOff: 'ZapOff',
  BookOpen: 'BookOpen',
  GitBranch: 'GitBranch',
  QrCode: 'QrCode',
  LayoutList: 'LayoutList',
  LayoutGrid: 'LayoutGrid',
  LayoutDashboard: 'LayoutDashboard',
  PanelLeft: 'PanelLeft',
  FileDown: 'FileDown',
  FileText: 'FileText',
  AlertCircle: 'AlertCircle',
  CheckCircle: 'CheckCircle',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  ArrowUpRight: 'ArrowUpRight',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  Plus: 'Plus',
  Minus: 'Minus',
  X: 'X',
  Search: 'Search',
  Trash2: 'Trash',
  Copy: 'Copy',
  Info: 'Info',
  Settings: 'Settings',
  Crown: 'Crown',
  Mic: 'Mic',
  Triangle: 'Triangle',
  Heart: 'Heart',
  Diamond: 'Diamond',
  Circle: 'Circle',
  Square: 'Square',
  Star: 'Star',
  Sparkles: 'Sparkles',
  Type: 'Type',
  Upload: 'Upload',
  Download: 'Download',
  Play: 'Play',
  Pause: 'Pause',
  Palette: 'Palette',
  Layers: 'Layers',
  Layout: 'Layout',
  Map: 'Map',
  Flag: 'Flag',
  Smile: 'Smile',
  Shapes: 'Shapes',
  Zap: 'Zap',
  Pencil: 'Pencil',
  Globe: 'Globe',
  Network: 'Network',
  Target: 'Target',
  Lightbulb: 'Lightbulb',
  Mail: 'Mail',
  Phone: 'Phone',
  MapPin: 'MapPin',
  Calendar: 'Calendar',
  User: 'User',
  Briefcase: 'Briefcase',
  Terminal: 'Terminal',
  ShieldCheck: 'ShieldCheck',
  BadgeCheck: 'BadgeCheck',
  TrendingUp: 'TrendingUp',
  Home: 'Home',
  History: 'History',
  MoreHorizontal: 'MoreHorizontal',
  Building2: 'Building2',
  Save: 'Save',
  Unlock: 'Unlock',
  Paintbrush: 'Paintbrush',
  Pipette: 'Pipette',
  ZoomIn: 'ZoomIn',
  ZoomOut: 'ZoomOut',
  Wifi: 'Wifi',
  AlertTriangle: 'AlertTriangle',
  LogOut: 'LogOut',
  Monitor: 'Monitor',
  Smartphone: 'Smartphone',
  Laptop: 'Laptop',
  Tablet: 'Tablet',
  Shield: 'Shield',
  Activity: 'Activity',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  AlignLeft: 'AlignLeft',
  AlignCenter: 'AlignCenter',
  AlignRight: 'AlignRight',
  AlignJustify: 'AlignJustify',
  AlignStartHorizontal: 'AlignStartHorizontal',
  AlignEndHorizontal: 'AlignEndHorizontal',
  Presentation: 'Presentation',
  FlaskConical: 'FlaskConical',
  RotateCcw: 'RotateCcw',
  Move: 'Move',
  Check: 'Check',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  ChevronDown: 'ChevronDown',
  AlignLeft: 'AlignLeft',
  SpellCheck: 'SpellCheck',
  RotateCcw: 'RotateCcw',
  FlaskConical: 'FlaskConical',
  Presentation: 'Presentation',
  Pause: 'Pause',
  Minimize: 'Minimize',
  Maximize: 'Maximize',
  Volume2: 'Volume2',
  VolumeX: 'VolumeX',
  SkipForward: 'SkipForward',
  SkipBack: 'SkipBack',
  Repeat: 'Repeat',
  Shuffle: 'Shuffle',
  Sun: 'Sun',
  Moon: 'Moon',
  ExternalLink: 'ExternalLink',
  Filter: 'Filter',
  Send: 'Send',
  Paperclip: 'Paperclip',
  SlidersHorizontal: 'SlidersHorizontal',
  DownloadCloud: 'DownloadCloud',
  Bell: 'Bell',
  HelpCircle: 'HelpCircle',
  LogIn: 'LogIn',
  CreditCard: 'CreditCard',
};

const lucideNames = new Set([...icons, ...Object.keys(ALIASES)]);

const lines = [
  '/**',
  ' * Drop-in replacement for lucide-react — 100% local Streamline Material Rounded Line icons.',
  ' * Do not import lucide-react in app code; use this module.',
  ' */',
  "import type { OrbsteraIconProps } from './Icon';",
  "import type { ComponentType } from 'react';",
  "import * as G from './generated';",
  '',
  'export type LucideIcon = ComponentType<OrbsteraIconProps>;',
  '',
];

function resolveIconName(lucideName) {
  if (ALIASES[lucideName]) return ALIASES[lucideName];
  if (icons.includes(lucideName)) return lucideName;
  return null;
}

const exported = new Set();
for (const lucideName of Object.keys(ALIASES).sort()) {
  const gen = resolveIconName(lucideName);
  if (!gen || exported.has(lucideName)) continue;
  exported.add(lucideName);
  lines.push(`export const ${lucideName}: LucideIcon = G.Icon${gen};`);
}

for (const name of icons.sort()) {
  if (exported.has(name)) continue;
  lines.push(`export const ${name}: LucideIcon = G.Icon${name};`);
  exported.add(name);
}

lines.push('');
lines.push('/** Namespace compat for `import * as Icons from ...` */');
lines.push('export * from \'./generated\';');

fs.writeFileSync(OUT, lines.join('\n'));
console.log('Wrote', OUT, 'exports:', exported.size);
