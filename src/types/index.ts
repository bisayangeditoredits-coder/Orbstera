// ─── Slide Layout Types ───────────────────────────────────────────────────────
export type SlideLayoutType =
  | 'hero'
  | 'content'
  | 'split'
  | 'media'
  | 'quote'
  | 'chart'
  | 'team'
  | 'timeline'
  | 'closing'
  | 'bullets'
  | 'stats'
  | 'comparison';

// ─── Animation Types ──────────────────────────────────────────────────────────
export type AnimationEntrance =
  | 'fadeSlideUp'
  | 'fadeSlideLeft'
  | 'fadeIn'
  | 'zoomIn'
  | 'slideRight'
  | 'bounceIn'
  | 'glitch'
  | 'reveal'
  | 'elasticScale'
  | 'flipIn'
  | 'blurIn'
  | 'none';

export interface AnimationConfig {
  entrance: AnimationEntrance;
  duration: number;
  delay?: number;
}

// ─── Chart Types ──────────────────────────────────────────────────────────────
export type ChartType = 'bar' | 'line' | 'pie' | 'donut';

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
}

export interface ChartData {
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
}

// ─── Canvas Element Types ─────────────────────────────────────────────────────
export type ElementType = 'text' | 'image' | 'shape' | 'chart' | 'icon';

export interface TextStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  lineHeight?: number;
  letterSpacing?: number;
}

export interface ShapeStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  cornerRadius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}

export interface SlideElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  // Text element
  content?: string;
  textStyle?: TextStyle;
  // Image element
  src?: string;
  // Shape element
  shapeType?: 'rect' | 'circle' | 'triangle' | 'star' | 'line' | 'arrow';
  shapeStyle?: ShapeStyle;
  // Chart element
  chartData?: ChartData;
  // Animation
  animation?: AnimationConfig;
  zIndex?: number;
}

// ─── Slide Types ──────────────────────────────────────────────────────────────
export interface Slide {
  id: string;
  type: SlideLayoutType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  imagePrompt?: string;
  imageUrl?: string;
  chart?: ChartData | null;
  animation?: AnimationConfig;
  elements?: SlideElement[];
  backgroundStyle?: string;
  backgroundColor?: string;
  speakerNotes?: string;
  visualDirection?: string;
}

// ─── Presentation Types ───────────────────────────────────────────────────────
export interface FontPairing {
  heading: string;
  body: string;
}

export interface PresentationData {
  id?: string;
  title: string;
  theme: string;
  colorPalette: string[];
  fontPairing: FontPairing;
  animationStyle: string;
  slides: Slide[];
  createdAt?: string;
  updatedAt?: string;
}

// ─── Editor State Types ───────────────────────────────────────────────────────
export interface HistoryEntry {
  slides: Slide[];
  timestamp: number;
}

export interface EditorState {
  selectedElementId: string | null;
  isDragging: boolean;
  isResizing: boolean;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  isPresenting: boolean;
  isGenerating: boolean;
  previewElementId: string | null;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────
export type PanelTab = 'generate' | 'layers' | 'design' | 'notes';

export interface GenerateOptions {
  prompt: string;
  mode: 'standard' | 'fast' | 'premium';
  slideCount: number;
  tone: 'professional' | 'creative' | 'casual' | 'bold' | 'minimal';
  language: string;
}
