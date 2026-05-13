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

// ─── Slide transition (present mode & export hints) ──────────────────────────
export type SlideTransition =
  | 'fade'
  | 'smoothSlide'
  | 'zoom'
  | 'blurReveal'
  | 'parallaxFlow'
  | 'morph'
  | 'crossDissolve'
  | 'glassSwipe'
  | 'depth'
  | 'dynamicScale'
  | 'verticalFlow'
  | 'horizontalCinematic'
  | 'layerReveal'
  | 'floating'
  | 'keynote';

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
  | 'none'
  | 'parallaxDrift'
  | 'verticalRise'
  | 'horizontalReveal'
  | 'depthRise'
  | 'glassBlur'
  | 'floatGentle'
  | 'scaleSoft'
  | 'morphBlend'
  | 'cinematicImageZoom'
  | 'typewriterWords'
  | 'staggerLines';

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
  /** True while this slot is waiting on deck-level /api/generate-image (UI placeholder). */
  aiImagePending?: boolean;
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
export interface SlideContentBlock {
  bullets?: string[];
}

export interface Slide {
  id: string;
  type: SlideLayoutType;
  title: string;
  subtitle?: string;
  bullets?: string[];
  /** AI layout hint — drives canvas placement in layout engine */
  layout?: string;
  visualStyle?: string;
  content?: SlideContentBlock;
  imagePrompt?: string;
  imageUrl?: string;
  chart?: ChartData | null;
  animation?: AnimationConfig;
  /** Per-slide transition in presentation mode (overrides deck default). */
  slideTransition?: SlideTransition;
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

export interface PresentationImportMeta {
  fileName: string;
  format: 'pptx' | 'ppt';
  warnings?: string[];
}

// ─── Presentation DNA (AI Director presets) ────────────────────────────────────
export interface PresentationDNA {
  /** Overall narrative pattern, e.g. \"startup_pitch\", \"education\", \"marketing\", \"corporate\". */
  narrativeProfile: string;
  /** Visual tone: dark, light, luxury, futuristic, editorial, etc. */
  visualTone: string;
  /** Typography pairing identity (beyond raw font names), e.g. \"tech_sans\", \"corporate_serif\". */
  typographyIdentity: string;
  /** Global spacing scale, e.g. \"cozy\", \"balanced\", \"airy\". */
  spacingScale: 'compact' | 'balanced' | 'airy';
  /** Motion intensity preset, e.g. low/medium/high cinematic. */
  motionProfile: 'cinematic_low' | 'cinematic_medium' | 'cinematic_high';
  /** Layout density: how much content per slide the director should allow. */
  densityMode: 'minimal' | 'standard' | 'rich';
  /** Palette family identifier, used to pick from predefined color sets. */
  colorProfile: string;
}

export interface PresentationData {
  id?: string;
  title: string;
  theme: string;
  colorPalette: string[];
  fontPairing: FontPairing;
  animationStyle: string;
  /** Default slide-to-slide transition when a slide has no `slideTransition`. */
  defaultSlideTransition?: SlideTransition;
  /** Gradients, particles, and ambient motion in presenter (not exported to PPTX). */
  cinematicPresenterEffects?: boolean;
  slides: Slide[];
  createdAt?: string;
  updatedAt?: string;
  /** AI-detected deck archetype */
  presentationType?: string;
  /** UI / export style preset */
  styleMode?: string;
  intentSummary?: string;
  /** AI Presentation Director DNA for this deck (used by layout/motion engines). */
  dna?: PresentationDNA;
  /** Server-owned revision counter for optimistic concurrency on cloud saves */
  saveVersion?: number;
  /** Last successful cloud persist (ISO) */
  lastCloudSavedAt?: string;
  /** Origin of deck */
  source?: 'ai' | 'import' | 'manual';
  importMeta?: PresentationImportMeta;
  /** Set by API when persisting to R2 */
  userId?: string;
}

// ─── Editor State Types ───────────────────────────────────────────────────────
export interface HistoryEntry {
  slides: Slide[];
  timestamp: number;
}

export type DeckGenerationLifecycle =
  | 'idle'
  | 'connecting'
  | 'streaming'
  /** Stream closed; parsing accumulated JSON before deck commit */
  | 'building'
  | 'polishing'
  /** Deck JSON applied — optional AI visuals still hydrating */
  | 'images';

export interface EditorState {
  activeTool: 'select' | 'gen-fill';
  selectedElementId: string | null;
  /** After drawing a generative-fill region, prompts appear for this element. */
  generativeFillTarget: { slideId: string; elementId: string } | null;
  isDragging: boolean;
  isResizing: boolean;
  zoom: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  isPresenting: boolean;
  isGenerating: boolean;
  /** Full splash overlay vs slim banner — images phase shows canvas realtime */
  generationBlockingOverlay: boolean;
  /** Monotonic counter; stale async image tasks ignore progress counters */
  generationEpoch: number;
  deckGenerationLifecycle: DeckGenerationLifecycle;
  /** User-requested slide count for this generation (progress denominator) */
  generationTargetSlides: number;
  /** Tracked AI image HTTP jobs for this generationEpoch */
  generationPendingImages: number;
  generationImageJobsTotal: number;
  generationImageJobsCompleted: number;
  previewElementId: string | null;
  reasoning: string;
  pan: { x: number; y: number };
  /** Multi-model orchestration UI */
  orchestrationPhase: string;
  activeModelLabel: string;
  /** Cloud autosave / sync indicator */
  cloudSyncStatus: 'idle' | 'saving' | 'saved' | 'error' | 'conflict' | 'retrying';
  cloudSyncMessage?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────
export type PanelTab = 'generate' | 'layers' | 'design' | 'notes';

export interface GenerateOptions {
  prompt: string;
  slideCount: number;
  tone: 'professional' | 'creative' | 'casual' | 'bold' | 'minimal';
  language: string;
}
