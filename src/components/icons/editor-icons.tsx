/**
 * @deprecated Prefer named imports from `@/components/icons/lucide`.
 * Re-exports for backward compatibility with early Streamline migration.
 */
export type { LucideIcon } from './lucide';
export type { OrbsteraIconProps as EditorIconProps } from './Icon';
export * from './lucide';

import type { LucideIcon } from './lucide';
import * as L from './lucide';

/** Lucide-compatible map used by LeftIconRail / TopBar */
export const EditorIcons = {
  LayoutTemplate: L.LayoutTemplate,
  Sparkles: L.Sparkles,
  MousePointer2: L.MousePointer2,
  Type: L.Type,
  Upload: L.Upload,
  Layers: L.Layers,
  Wand2: L.Wand2,
  StickyNote: L.StickyNote,
  Grid3x3: L.Grid3x3,
  ArrowLeft: L.ArrowLeft,
  Play: L.Play,
  Download: L.Download,
  Share2: L.Share2,
  Loader2: L.Loader2,
  FileText: L.FileText,
  CheckCircle: L.CheckCircle,
  Pencil: L.Pencil,
  X: L.X,
  Undo2: L.Undo2,
  Redo2: L.Redo2,
  FileDown: L.FileDown,
  PackageCheck: L.PackageCheck,
  Clock: L.Clock,
  AlignLeft: L.AlignLeft,
  Palette: L.Palette,
  AlertCircle: L.AlertCircle,
  RefreshCw: L.RefreshCw,
  PanelLeft: L.PanelLeft,
  Square: L.Square,
  ImageIcon: L.ImageIcon,
  Image: L.Image,
  Minus: L.Minus,
  Shapes: L.Shapes,
  Smile: L.Smile,
  Clapperboard: L.Clapperboard,
  BookOpen: L.BookOpen,
  SpellCheck: L.SpellCheck,
  Layout: L.Layout,
  LayoutGrid: L.LayoutGrid,
  BarChart2: L.BarChart2,
  GitBranch: L.GitBranch,
  Map: L.Map,
  QrCode: L.QrCode,
  Star: L.Star,
  Plus: L.Plus,
  ChevronLeft: L.ChevronLeft,
  ChevronRight: L.ChevronRight,
  ChevronDown: L.ChevronDown,
  Search: L.Search,
  Trash2: L.Trash2,
  Copy: L.Copy,
  Info: L.Info,
  Zap: L.Zap,
  Settings: L.Settings,
  UserCircle2: L.UserCircle2,
  Flag: L.Flag,
  Video: L.Video,
  Link: L.Link,
  Crown: L.Crown,
  Mic: L.Mic,
  MicOff: L.MicOff,
  Triangle: L.Triangle,
  Heart: L.Heart,
  Diamond: L.Diamond,
  Circle: L.Circle,
  GripVertical: L.GripVertical,
  ChevronUp: L.ChevronUp,
  BarChart3: L.BarChart3,
  ScanIcon: L.ScanIcon,
} as const satisfies Record<string, LucideIcon>;

export function getEditorIcon(name: keyof typeof EditorIcons | string): LucideIcon | null {
  return (EditorIcons as Record<string, LucideIcon>)[name] ?? null;
}
