import React from 'react';
import { ZwiIcon } from '@/components/ui/ZwiIcon';

function withZwi(name: string) {
  return React.forwardRef<HTMLElement, any>((props, ref) => {
    const { size, color, className, strokeWidth, ...rest } = props;
    return (
      <ZwiIcon
        ref={ref}
        name={name}
        size={size || 16}
        className={className}
        style={{ color, ...rest.style }}
        {...rest}
      />
    );
  });
}

// Mapping of Lucide icons to Zwicon classes
export const AlignCenter = withZwi('text-align-center');
export const AlignJustify = withZwi('text-align-justify');
export const AlignLeft = withZwi('text-align-left');
export const AlignRight = withZwi('text-align-right');
export const AlertCircle = withZwi('danger');
export const ArrowDown = withZwi('arrow-down');
export const ArrowLeft = withZwi('arrow-left');
export const ArrowRight = withZwi('arrow-right');
export const ArrowUp = withZwi('arrow-up');
export const BarChart3 = withZwi('chart-bar');
export const Bold = withZwi('bold');
export const Check = withZwi('done');
export const CheckCircle = withZwi('verified');
export const CheckCircle2 = withZwi('verified');
export const ChevronDown = withZwi('chevron-down');
export const ChevronLeft = withZwi('chevron-left');
export const ChevronRight = withZwi('chevron-right');
export const ChevronUp = withZwi('chevron-up');
export const Clock = withZwi('clock');
export const Columns = withZwi('split-v');
export const Copy = withZwi('copy');
export const Crown = withZwi('crown');
export const Download = withZwi('download');
export const Eye = withZwi('eye');
export const EyeOff = withZwi('eye-close');
export const FileDown = withZwi('download');
export const FileText = withZwi('document');
export const Grid3x3 = withZwi('menu');
export const Grid3X3 = withZwi('menu');
export const GripVertical = withZwi('more-v');
export const Heart = withZwi('heart');
export const Image = withZwi('photo');
export const ImageIcon = withZwi('photo');
export const Info = withZwi('information');
export const Italic = withZwi('italic');
export const Layers = withZwi('layers');
export const Layout = withZwi('dashboard');
export const LayoutGrid = withZwi('dashboard');
export const LayoutList = withZwi('ordered-list');
export const LayoutTemplate = withZwi('dashboard');
export const LinkIcon = withZwi('link');
export const Loader2 = withZwi('refresh-double');
export const Lock = withZwi('lock');
export const Mic = withZwi('microphone');
export const MicOff = withZwi('no-microphone');
export const Minus = withZwi('minus');
export const MousePointer2 = withZwi('arrow-top-left');
export const Move = withZwi('move');
export const PackageCheck = withZwi('inbox');
export const Palette = withZwi('palette');
export const PanelLeft = withZwi('dashboard');
export const Pencil = withZwi('edit-pencil');
export const PenTool = withZwi('pen');
export const Play = withZwi('play');
export const Plus = withZwi('add');
export const QrCode = withZwi('qr-code');
export const Redo2 = withZwi('redo');
export const RefreshCw = withZwi('sync');
export const RotateCcw = withZwi('rotate-l');
export const ScanIcon = withZwi('scan');
export const Search = withZwi('search');
export const Share2 = withZwi('share');
export const Smile = withZwi('emoji-happy');
export const Sparkles = withZwi('magic');
export const Square = withZwi('shape-square');
export const Star = withZwi('star');
export const Strikethrough = withZwi('strikethrough');
export const Trash2 = withZwi('trash');
export const Triangle = withZwi('shape-triangle');
export const Type = withZwi('caption');
export const Underline = withZwi('underline');
export const Undo2 = withZwi('undo');
export const Unlock = withZwi('unlock');
export const Upload = withZwi('upload');
export const Video = withZwi('video');
export const Wand2 = withZwi('magic');
export const X = withZwi('close');
export const Zap = withZwi('lightning');
export const YoutubeIcon = withZwi('video');
export const MousePointer = withZwi('arrow-top-left');
export const Maximize2 = withZwi('expand');
export const Minimize2 = withZwi('collapse');
export const BrainCircuit = withZwi('atom');
export const Target = withZwi('target');
export const TrendingUp = withZwi('growth');
export const BookOpen = withZwi('book-open');
export const Volume2 = withZwi('volume-high');
export const Globe = withZwi('globe');
export const Stars = withZwi('magic');
export const MessageSquare = withZwi('chat-bubble');
export const AlignStartHorizontal = withZwi('align-left');
export const AlignCenterHorizontal = withZwi('align-h');
export const AlignEndHorizontal = withZwi('align-right');
export const AlignStartVertical = withZwi('align-top');
export const AlignCenterVertical = withZwi('align-v');
export const AlignEndVertical = withZwi('align-bottom');
export const AlignHorizontalDistributeCenter = withZwi('distribute-h');
export const AlignVerticalDistributeCenter = withZwi('distribute-v');
export const Save = withZwi('save');
export const Briefcase = withZwi('archive');
export const FlaskConical = withZwi('flask');
export const Pause = withZwi('pause');
export const Presentation = withZwi('widescreen');
export const Users = withZwi('people');
export const ZapOff = withZwi('flash-off');
export const GraduationCap = withZwi('graduate');
export const Rocket = withZwi('send');
export const Link = withZwi('link');

// Some components import renaming: import { Image as ImageIcon }
// We can just export it as Image too
