/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useCallback } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';
import {
  usePanelStore,
  type WikiSummaryPersisted,
  type WikiSearchResultPersisted,
  type WikiInsertMode,
  type WikiView,
} from '@/store/usePanelStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Loader2, X, BookOpen, ImageIcon, FileText,
  ExternalLink, ChevronLeft, Sparkles, Globe, Clock,
  LayoutTemplate, AlignLeft, Layers, ArrowRight, CheckCircle2,
  Brain, Rocket, Leaf, Cpu, MapPin, Zap, Landmark, Sun, Waves, Code2,
  TrendingUp, ChevronRight, Hash, Calendar, AlignJustify, SquareSplitHorizontal, LayoutGrid, ImagePlus
} from 'lucide-react';

// ─── Types (persisted slice lives in usePanelStore) ───────────────────────────
type WikiSummary = WikiSummaryPersisted;
type WikiSearchResult = WikiSearchResultPersisted;
type InsertMode = WikiInsertMode;
type View = WikiView;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hdImageUrl(s: WikiSummary): string | undefined {
  if (s.originalimage?.source) return s.originalimage.source;
  if (s.thumbnail?.source) return s.thumbnail.source.replace(/\/\d+px-/, '/1280px-');
  return undefined;
}
function readingTime(text: string) {
  return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
}
function formatDate(ts?: string) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch { return ''; }
}

/** Extract first N paragraphs from full text */
function getFirstParagraphs(text: string, maxChars: number): string {
  const paras = text.split(/\n\n+/).filter(p => p.trim().length > 40);
  let out = '';
  for (const p of paras) {
    if ((out + p).length > maxChars) break;
    out += (out ? '\n\n' : '') + p.trim();
  }
  return out || text.substring(0, maxChars);
}

/** Parse section headings + content from Wikipedia full text */
function parseSections(fullText: string): { heading: string; body: string }[] {
  const lines = fullText.split('\n');
  const sections: { heading: string; body: string }[] = [];
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const match = line.match(/^={2,3}\s*(.+?)\s*={2,3}$/);
    if (match) {
      if (currentBody.some(l => l.trim().length > 20)) {
        sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
      }
      currentHeading = match[1];
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  if (currentBody.some(l => l.trim().length > 20)) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n').trim() });
  }
  return sections.filter(s => s.body.length > 30);
}

/** Extract key facts lines (lines with years, numbers, "born", "founded", etc.) */
function extractKeyFacts(text: string, max = 6): string[] {
  const lines = text.split('\n').filter(l => l.trim().length > 15 && l.trim().length < 200);
  const facts: string[] = [];
  const patterns = [
    /\b(born|died|founded|established|created|invented|discovered|published|released|formed|opened)\b/i,
    /\b\d{4}\b/,
    /\b(is|was|are|were)\s+a\b/i,
    /\b(capital|population|area|length|height|located|known)\b/i,
  ];
  for (const line of lines) {
    if (patterns.some(p => p.test(line))) {
      const clean = line.replace(/^[•\-–—*]\s*/, '').trim();
      if (clean.length > 15 && !facts.includes(clean)) {
        facts.push(clean);
      }
      if (facts.length >= max) break;
    }
  }
  return facts;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TRENDING: { label: string; icon: React.FC<any>; color: string }[] = [
  { label: 'Artificial Intelligence', icon: Brain,    color: '#818cf8' },
  { label: 'Space Exploration',       icon: Rocket,   color: '#38bdf8' },
  { label: 'Climate Change',          icon: Leaf,     color: '#34d399' },
  { label: 'Quantum Computing',       icon: Cpu,      color: '#c084fc' },
  { label: 'Philippines',             icon: MapPin,   color: '#fbbf24' },
  { label: 'Machine Learning',        icon: Zap,      color: '#f472b6' },
  { label: 'Roman Empire',            icon: Landmark, color: '#a8a29e' },
  { label: 'Solar System',            icon: Sun,      color: '#fb923c' },
  { label: 'Ocean Biodiversity',      icon: Waves,    color: '#22d3ee' },
  { label: 'Web Development',         icon: Code2,    color: '#94a3b8' },
];

const LANGS = [
  { code: 'en', label: 'English',  short: 'EN', flag: '🇺🇸' },
  { code: 'tl', label: 'Filipino', short: 'TL', flag: '🇵🇭' },
  { code: 'es', label: 'Español',  short: 'ES', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', short: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',  short: 'DE', flag: '🇩🇪' },
  { code: 'ja', label: 'æ—¥æœ¬èªž',   short: 'JA', flag: '🇯🇵' },
];

type ModeConfig = { id: InsertMode; icon: any; label: string; desc: string };
const INSERT_MODES: ModeConfig[] = [
  { id: 'rich-detail',    icon: AlignJustify,          label: 'Rich Detail',     desc: 'Title + desc + full paragraphs + key facts' },
  { id: 'split-detail',   icon: SquareSplitHorizontal, label: 'Split Detail',    desc: 'Photo left, rich text + facts right' },
  { id: 'info-grid',      icon: Hash,                  label: 'Info Grid',       desc: 'Title + 4 section highlights in grid' },
  { id: 'full-slide',     icon: LayoutTemplate,        label: 'Full Slide',      desc: 'Image BG + title + summary' },
  { id: 'title-body',     icon: FileText,              label: 'Title + Body',    desc: 'Clean title with long summary text' },
  { id: 'title-only',     icon: AlignLeft,             label: 'Title Only',      desc: 'Large centered title' },
  { id: 'image-only',     icon: ImageIcon,             label: 'Image Only',      desc: 'Full HD Wikipedia photo' },
  { id: 'photo-collage',  icon: LayoutGrid,            label: 'Visual Gallery',  desc: 'Beautiful 4-image masonry collage' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function WikipediaPanel({ onClose }: { onClose?: () => void }) {
  const {
    query,
    lang,
    results,
    selected,
    view,
    insertMode,
    showFullArticle,
    articleTab,
  } = usePanelStore((s) => s.wikipedia);
  const patchWikipedia = usePanelStore((s) => s.patchWikipedia);

  const [predictions, setPredictions] = useState<string[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState('');
  const [inserted, setInserted] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addElement     = usePresentationStore((s) => s.addElement);
  const updateSlide    = usePresentationStore((s) => s.updateSlide);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation   = usePresentationStore((s) => s.presentation);

  const getSlide = useCallback(() => {
    if (currentSlideIndex === null || !presentation) return null;
    return presentation.slides[currentSlideIndex];
  }, [currentSlideIndex, presentation]);

  // ── Search ──────────────────────────────────────────────────────────────────
  const fetchPredictions = useCallback(async (sq: string) => {
    if (!sq.trim()) { setPredictions([]); setShowPredictions(false); return; }
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(sq)}&limit=5&namespace=0&format=json&origin=*`;
      const res = await fetch(url);
      const data = await res.json();
      setPredictions(data[1] || []);
      setShowPredictions(true);
    } catch { setPredictions([]); setShowPredictions(false); }
  }, [lang]);

  const search = useCallback(async (q?: string) => {
    const sq = (q ?? query).trim();
    if (!sq) return;
    setSearchLoading(true);
    patchWikipedia({ results: [], selected: null, view: 'results' });
    setError('');
    setShowPredictions(false);
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(sq)}&format=json&origin=*&srlimit=10&srprop=snippet|wordcount|timestamp`;
      const data = await (await fetch(url)).json();
      const hits: WikiSearchResult[] = data?.query?.search || [];
      patchWikipedia({ results: hits });
      if (!hits.length) setError(`No results found for "${sq}"`);
    } catch { setError('Search failed. Check your connection.'); }
    finally { setSearchLoading(false); }
  }, [query, lang, patchWikipedia]);

  // ── Load article ────────────────────────────────────────────────────────────
  const loadSummary = useCallback(async (title: string) => {
    setSummaryLoading(true);
    patchWikipedia({
      selected: null,
      view: 'article',
      showFullArticle: false,
      articleTab: 'read',
    });
    setError('');
    try {
      const [summaryData, extractData, mediaData] = await Promise.all([
        fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`).then(r => {
          if (!r.ok) throw new Error('Article not found');
          return r.json();
        }),
        fetch(`https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`).then(r => r.json()),
        fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`).then(r => r.ok ? r.json() : null),
      ]);
      const pages = extractData?.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId && pageId !== '-1') summaryData.fullText = pages[pageId].extract;
      }
      
      const galleryUrls: string[] = [];
      if (mediaData && mediaData.items) {
        for (const item of mediaData.items) {
          if (item.type === 'image' && item.showInGallery && item.srcset) {
            const best = item.srcset[item.srcset.length - 1];
            if (best && best.src && !best.src.endsWith('.svg') && !best.src.endsWith('.svg.png')) {
              galleryUrls.push(best.src.startsWith('//') ? 'https:' + best.src : best.src);
            }
          }
        }
      }
      summaryData.galleryUrls = galleryUrls.filter(Boolean);

      patchWikipedia({ selected: summaryData });
    } catch (err: any) { setError(err.message || 'Failed to load article.'); }
    finally { setSummaryLoading(false); }
  }, [lang, patchWikipedia]);

  // ── Insert ──────────────────────────────────────────────────────────────────
  const handleInsert = useCallback(() => {
    if (!selected) return;
    const slide = getSlide();
    if (!slide) return;

    const fullText = selected.fullText || selected.extract;
    // Fallback to gallery if main image is missing
    const hdSrc = hdImageUrl(selected) || (selected.galleryUrls && selected.galleryUrls.length > 0 ? selected.galleryUrls[0] : undefined);
    const now = `el-wiki-${Date.now()}`;
    const uid = (s: string) => `${now}-${s}`;

    // Text colors & fonts
    const WHITE = '#FFFFFF';
    const OFF   = '#D4D4D4';
    const DIM   = '#9CA3AF';
    const ACCENT = '#93C5FD';
    const H  = 'Inter';

    if (insertMode === 'title-only') {
      addElement(slide.id, {
        id: uid('t'), type: 'text', x: 80, y: 240, width: 1120, height: 220,
        content: selected.title,
        textStyle: { fontSize: 72, fontWeight: 'bold', color: WHITE, textAlign: 'center', lineHeight: 1.15, fontFamily: H },
        zIndex: 10,
      } as any);
      if (selected.description) {
        addElement(slide.id, {
          id: uid('d'), type: 'text', x: 160, y: 470, width: 960, height: 60,
          content: selected.description,
          textStyle: { fontSize: 22, fontWeight: 'normal', color: DIM, textAlign: 'center', lineHeight: 1.4, fontFamily: H },
          zIndex: 11,
        } as any);
      }

    } else if (insertMode === 'image-only') {
      if (hdSrc) {
      const ow = selected.originalimage?.width ?? 1920, oh = selected.originalimage?.height ?? 1080;
      let w = ow, h = oh;
      if (w > 1100) { h = h * (1100 / w); w = 1100; }
      if (h > 660)  { w = w * (660  / h); h = 660; }
      addElement(slide.id, {
        id: uid('i'), type: 'image',
        x: Math.round((1280 - w) / 2), y: Math.round((720 - h) / 2),
        width: Math.round(w), height: Math.round(h), src: hdSrc, zIndex: 10,
      } as any);

      } else {
        addElement(slide.id, {
          id: uid('t-fb'), type: 'text', x: 80, y: 240, width: 1120, height: 220,
          content: selected.title + '\n(No Image Available)',
          textStyle: { fontSize: 60, fontWeight: 'bold', color: WHITE, textAlign: 'center', lineHeight: 1.15, fontFamily: H },
          zIndex: 10,
        } as any);
      }

    } else if (insertMode === 'title-body') {
      const body = getFirstParagraphs(fullText, 1400);
      addElement(slide.id, {
        id: uid('t'), type: 'text', x: 80, y: 50, width: 1120, height: 90,
        content: selected.title,
        textStyle: { fontSize: 48, fontWeight: 'bold', color: WHITE, textAlign: 'left', lineHeight: 1.15, fontFamily: H },
        zIndex: 10,
      } as any);
      if (selected.description) {
        addElement(slide.id, {
          id: uid('d'), type: 'text', x: 80, y: 148, width: 1120, height: 36,
          content: selected.description,
          textStyle: { fontSize: 18, fontWeight: 'normal', color: ACCENT, textAlign: 'left', lineHeight: 1.3, fontFamily: H },
          zIndex: 11,
        } as any);
      }
      // Accent line
      addElement(slide.id, {
        id: uid('line'), type: 'shape', shapeType: 'rect', x: 80, y: 193, width: 80, height: 3,
        shapeStyle: { fill: ACCENT, cornerRadius: 2 }, zIndex: 12,
      } as any);
      addElement(slide.id, {
        id: uid('b'), type: 'text', x: 80, y: 210, width: 1120, height: 460,
        content: body,
        textStyle: { fontSize: 19, fontWeight: 'normal', color: OFF, textAlign: 'left', lineHeight: 1.8, fontFamily: H },
        zIndex: 10,
      } as any);

    } else if (insertMode === 'full-slide') {
      if (hdSrc) {
        updateSlide(slide.id, {
          elements: [
            { id: uid('bg'), type: 'image', x: 0, y: 0, width: 1280, height: 720, src: hdSrc, zIndex: 0, opacity: 0.25 } as any,
            { id: uid('ov'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: 1280, height: 720, shapeStyle: { fill: '#05050e', cornerRadius: 0 }, opacity: 0.72, zIndex: 1 } as any,
            ...(slide.elements ?? []),
          ],
        });
      }
      const summary = getFirstParagraphs(fullText, 700);
      addElement(slide.id, {
        id: uid('t'), type: 'text', x: 80, y: 55, width: 1120, height: 105,
        content: selected.title,
        textStyle: { fontSize: 54, fontWeight: 'bold', color: WHITE, textAlign: 'left', lineHeight: 1.2, fontFamily: H },
        zIndex: 10,
      } as any);
      if (selected.description) {
        addElement(slide.id, {
          id: uid('d'), type: 'text', x: 80, y: 166, width: 1120, height: 40,
          content: selected.description,
          textStyle: { fontSize: 20, fontWeight: 'normal', color: ACCENT, textAlign: 'left', lineHeight: 1.3, fontFamily: H },
          zIndex: 11,
        } as any);
      }
      addElement(slide.id, {
        id: uid('sep'), type: 'shape', shapeType: 'rect', x: 80, y: 214, width: 1120, height: 1,
        shapeStyle: { fill: 'rgba(255,255,255,0.12)', cornerRadius: 0 }, zIndex: 12,
      } as any);
      addElement(slide.id, {
        id: uid('b'), type: 'text', x: 80, y: 230, width: 1120, height: 430,
        content: summary,
        textStyle: { fontSize: 21, fontWeight: 'normal', color: OFF, textAlign: 'left', lineHeight: 1.85, fontFamily: H },
        zIndex: 10,
      } as any);

    } else if (insertMode === 'rich-detail') {
      // ── RICH DETAIL: full paragraphs + key facts sidebar ──────────────────
      if (hdSrc) {
        updateSlide(slide.id, {
          elements: [
            { id: uid('bg'), type: 'image', x: 0, y: 0, width: 1280, height: 720, src: hdSrc, zIndex: 0, opacity: 0.18 } as any,
            { id: uid('ov'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: 1280, height: 720, shapeStyle: { fill: '#040411', cornerRadius: 0 }, opacity: 0.82, zIndex: 1 } as any,
            ...(slide.elements ?? []),
          ],
        });
      }

      const mainBody = getFirstParagraphs(fullText, 900);
      const keyFacts = extractKeyFacts(fullText, 5);
      const sections = parseSections(fullText).slice(0, 3);

      // Title
      addElement(slide.id, {
        id: uid('title'), type: 'text', x: 55, y: 38, width: 880, height: 80,
        content: selected.title,
        textStyle: { fontSize: 46, fontWeight: 'bold', color: WHITE, textAlign: 'left', lineHeight: 1.15, fontFamily: H },
        zIndex: 10,
      } as any);

      // Description tag
      if (selected.description) {
        addElement(slide.id, {
          id: uid('desc'), type: 'text', x: 55, y: 124, width: 870, height: 32,
          content: selected.description,
          textStyle: { fontSize: 17, fontWeight: 'normal', color: ACCENT, textAlign: 'left', lineHeight: 1.3, fontFamily: H },
          zIndex: 11,
        } as any);
      }

      // Accent rule
      addElement(slide.id, {
        id: uid('rule'), type: 'shape', shapeType: 'rect', x: 55, y: 162, width: 1170, height: 1,
        shapeStyle: { fill: 'rgba(255,255,255,0.1)', cornerRadius: 0 }, zIndex: 12,
      } as any);

      // Main body text (left column)
      addElement(slide.id, {
        id: uid('body'), type: 'text', x: 55, y: 176, width: 760, height: 500,
        content: mainBody,
        textStyle: { fontSize: 17, fontWeight: 'normal', color: OFF, textAlign: 'left', lineHeight: 1.85, fontFamily: H },
        zIndex: 10,
      } as any);

      // Right sidebar: KEY FACTS box
      addElement(slide.id, {
        id: uid('sidebar-bg'), type: 'shape', shapeType: 'rect', x: 840, y: 176, width: 385, height: 500,
        shapeStyle: { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.09)', strokeWidth: 1, cornerRadius: 16 }, zIndex: 10,
      } as any);
      addElement(slide.id, {
        id: uid('sf-label'), type: 'text', x: 860, y: 194, width: 345, height: 24,
        content: 'KEY FACTS',
        textStyle: { fontSize: 11, fontWeight: 'bold', color: ACCENT, textAlign: 'left', lineHeight: 1, fontFamily: H, letterSpacing: 2 },
        zIndex: 11,
      } as any);
      addElement(slide.id, {
        id: uid('sf-rule'), type: 'shape', shapeType: 'rect', x: 860, y: 224, width: 345, height: 1,
        shapeStyle: { fill: 'rgba(255,255,255,0.09)', cornerRadius: 0 }, zIndex: 12,
      } as any);

      if (keyFacts.length > 0) {
        keyFacts.slice(0, 5).forEach((fact, i) => {
          const fy = 236 + i * 82;
          // Bullet dot
          addElement(slide.id, {
            id: uid(`dot-${i}`), type: 'shape', shapeType: 'circle', x: 860, y: fy + 6, width: 6, height: 6,
            shapeStyle: { fill: ACCENT }, zIndex: 13,
          } as any);
          addElement(slide.id, {
            id: uid(`fact-${i}`), type: 'text', x: 876, y: fy, width: 329, height: 70,
            content: fact.length > 130 ? fact.substring(0, 127) + '…' : fact,
            textStyle: { fontSize: 14, fontWeight: 'normal', color: '#CBD5E1', textAlign: 'left', lineHeight: 1.6, fontFamily: H },
            zIndex: 13,
          } as any);
        });
      } else {
        // Fallback: section headings as facts
        sections.slice(0, 4).forEach((sec, i) => {
          const fy = 236 + i * 95;
          addElement(slide.id, {
            id: uid(`sec-h-${i}`), type: 'text', x: 860, y: fy, width: 345, height: 22,
            content: sec.heading.toUpperCase(),
            textStyle: { fontSize: 10, fontWeight: 'bold', color: ACCENT, textAlign: 'left', lineHeight: 1, fontFamily: H, letterSpacing: 1.5 },
            zIndex: 12,
          } as any);
          addElement(slide.id, {
            id: uid(`sec-b-${i}`), type: 'text', x: 860, y: fy + 26, width: 345, height: 58,
            content: sec.body.substring(0, 160) + (sec.body.length > 160 ? '…' : ''),
            textStyle: { fontSize: 13, fontWeight: 'normal', color: '#CBD5E1', textAlign: 'left', lineHeight: 1.55, fontFamily: H },
            zIndex: 12,
          } as any);
        });
      }

    } else if (insertMode === 'split-detail') {
      // ── SPLIT DETAIL: photo left + rich text + facts right ────────────────
      // Photo panel (left half)
      if (hdSrc) {
        addElement(slide.id, {
          id: uid('photo'), type: 'image', x: 0, y: 0, width: 520, height: 720, src: hdSrc, zIndex: 5,
        } as any);
      } else {
        addElement(slide.id, {
          id: uid('photo'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: 520, height: 720,
          shapeStyle: { fill: '#1E1B4B', cornerRadius: 0 }, zIndex: 5,
        } as any);
      }
      // Gradient over photo
      addElement(slide.id, {
        id: uid('photo-ov'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: 520, height: 720,
        shapeStyle: { fill: 'rgba(4,4,17,0.35)', cornerRadius: 0 }, zIndex: 6,
      } as any);
      // Caption on photo
      addElement(slide.id, {
        id: uid('caption'), type: 'text', x: 24, y: 640, width: 470, height: 56,
        content: selected.description || selected.title,
        textStyle: { fontSize: 15, fontWeight: 'bold', color: 'rgba(255,255,255,0.9)', textAlign: 'left', lineHeight: 1.4, fontFamily: H },
        zIndex: 7,
      } as any);

      // Right content panel bg
      addElement(slide.id, {
        id: uid('right-bg'), type: 'shape', shapeType: 'rect', x: 520, y: 0, width: 760, height: 720,
        shapeStyle: { fill: '#070714', cornerRadius: 0 }, zIndex: 4,
      } as any);

      // Title
      addElement(slide.id, {
        id: uid('title'), type: 'text', x: 556, y: 42, width: 688, height: 88,
        content: selected.title,
        textStyle: { fontSize: 40, fontWeight: 'bold', color: WHITE, textAlign: 'left', lineHeight: 1.2, fontFamily: H },
        zIndex: 10,
      } as any);

      // Description
      if (selected.description) {
        addElement(slide.id, {
          id: uid('desc'), type: 'text', x: 556, y: 136, width: 688, height: 30,
          content: selected.description,
          textStyle: { fontSize: 16, fontWeight: 'normal', color: ACCENT, textAlign: 'left', lineHeight: 1.3, fontFamily: H },
          zIndex: 11,
        } as any);
      }

      // Divider
      addElement(slide.id, {
        id: uid('div'), type: 'shape', shapeType: 'rect', x: 556, y: 172, width: 688, height: 1,
        shapeStyle: { fill: 'rgba(255,255,255,0.1)', cornerRadius: 0 }, zIndex: 12,
      } as any);

      // Main body text
      const body = getFirstParagraphs(fullText, 680);
      addElement(slide.id, {
        id: uid('body'), type: 'text', x: 556, y: 186, width: 688, height: 340,
        content: body,
        textStyle: { fontSize: 16, fontWeight: 'normal', color: OFF, textAlign: 'left', lineHeight: 1.85, fontFamily: H },
        zIndex: 10,
      } as any);

      // Facts strip at bottom
      const keyFacts = extractKeyFacts(fullText, 3);
      if (keyFacts.length > 0) {
        addElement(slide.id, {
          id: uid('facts-bg'), type: 'shape', shapeType: 'rect', x: 556, y: 540, width: 688, height: 148,
          shapeStyle: { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, cornerRadius: 14 }, zIndex: 10,
        } as any);
        addElement(slide.id, {
          id: uid('facts-label'), type: 'text', x: 574, y: 553, width: 200, height: 20,
          content: 'QUICK FACTS',
          textStyle: { fontSize: 10, fontWeight: 'bold', color: ACCENT, textAlign: 'left', lineHeight: 1, fontFamily: H, letterSpacing: 2 },
          zIndex: 11,
        } as any);
        keyFacts.forEach((fact, i) => {
          addElement(slide.id, {
            id: uid(`f${i}`), type: 'text', x: 574, y: 574 + i * 34, width: 652, height: 30,
            content: `• ${fact.substring(0, 140)}`,
            textStyle: { fontSize: 13, fontWeight: 'normal', color: '#CBD5E1', textAlign: 'left', lineHeight: 1.5, fontFamily: H },
            zIndex: 11,
          } as any);
        });
      }

    } else if (insertMode === 'info-grid') {
      // ── INFO GRID: title + 4 section boxes ───────────────────────────────
      if (hdSrc) {
        updateSlide(slide.id, {
          elements: [
            { id: uid('bg'), type: 'image', x: 0, y: 0, width: 1280, height: 720, src: hdSrc, zIndex: 0, opacity: 0.14 } as any,
            { id: uid('ov'), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: 1280, height: 720, shapeStyle: { fill: '#04040e', cornerRadius: 0 }, opacity: 0.88, zIndex: 1 } as any,
            ...(slide.elements ?? []),
          ],
        });
      }

      // Title
      addElement(slide.id, {
        id: uid('t'), type: 'text', x: 55, y: 36, width: 1170, height: 72,
        content: selected.title,
        textStyle: { fontSize: 50, fontWeight: 'bold', color: WHITE, textAlign: 'center', lineHeight: 1.15, fontFamily: H },
        zIndex: 10,
      } as any);

      // Description
      if (selected.description) {
        addElement(slide.id, {
          id: uid('d'), type: 'text', x: 200, y: 113, width: 880, height: 30,
          content: selected.description,
          textStyle: { fontSize: 17, fontWeight: 'normal', color: ACCENT, textAlign: 'center', lineHeight: 1.3, fontFamily: H },
          zIndex: 11,
        } as any);
      }

      // Rule
      addElement(slide.id, {
        id: uid('rule'), type: 'shape', shapeType: 'rect', x: 55, y: 150, width: 1170, height: 1,
        shapeStyle: { fill: 'rgba(255,255,255,0.1)', cornerRadius: 0 }, zIndex: 12,
      } as any);

      // Intro text spanning top
      const intro = getFirstParagraphs(fullText, 320);
      addElement(slide.id, {
        id: uid('intro'), type: 'text', x: 55, y: 164, width: 1170, height: 88,
        content: intro,
        textStyle: { fontSize: 16, fontWeight: 'normal', color: '#9CA3AF', textAlign: 'left', lineHeight: 1.75, fontFamily: H },
        zIndex: 10,
      } as any);

      // 4 section grid
      const sections = parseSections(fullText);
      const gridItems = sections.length > 0
        ? sections.slice(0, 4)
        : [
            { heading: 'Overview',    body: getFirstParagraphs(fullText, 200) },
            { heading: 'Background',  body: fullText.substring(200, 400).trim() },
            { heading: 'Key Details', body: fullText.substring(400, 600).trim() },
            { heading: 'Impact',      body: fullText.substring(600, 800).trim() },
          ];

      const boxW = 555, boxH = 195;
      const positions = [
        { x: 55,   y: 264 },
        { x: 670,  y: 264 },
        { x: 55,   y: 479 },
        { x: 670,  y: 479 },
      ];

      gridItems.slice(0, 4).forEach((sec, i) => {
        const { x, y } = positions[i];
        addElement(slide.id, {
          id: uid(`box-${i}`), type: 'shape', shapeType: 'rect', x, y, width: boxW, height: boxH,
          shapeStyle: { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.09)', strokeWidth: 1, cornerRadius: 16 }, zIndex: 10,
        } as any);
        // Section heading
        addElement(slide.id, {
          id: uid(`bh-${i}`), type: 'text', x: x + 18, y: y + 14, width: boxW - 36, height: 22,
          content: (sec.heading || 'Overview').toUpperCase(),
          textStyle: { fontSize: 10, fontWeight: 'bold', color: ACCENT, textAlign: 'left', lineHeight: 1, fontFamily: H, letterSpacing: 2 },
          zIndex: 11,
        } as any);
        // Accent mini-bar
        addElement(slide.id, {
          id: uid(`bar-${i}`), type: 'shape', shapeType: 'rect', x: x + 18, y: y + 40, width: 32, height: 2,
          shapeStyle: { fill: ACCENT, cornerRadius: 1 }, zIndex: 12,
        } as any);
        // Section body
        const bodyText = sec.body.substring(0, 260) + (sec.body.length > 260 ? '…' : '');
        addElement(slide.id, {
          id: uid(`bb-${i}`), type: 'text', x: x + 18, y: y + 52, width: boxW - 36, height: boxH - 64,
          content: bodyText,
          textStyle: { fontSize: 13, fontWeight: 'normal', color: '#CBD5E1', textAlign: 'left', lineHeight: 1.65, fontFamily: H },
          zIndex: 11,
        } as any);
      });

    } else if (insertMode === 'photo-collage') {
      // ── PHOTO COLLAGE: Beautiful 3 or 4 image masonry layout ─────────────
      const imgs = selected.galleryUrls && selected.galleryUrls.length > 0 ? selected.galleryUrls : (hdSrc ? [hdSrc] : []);
      const count = Math.min(imgs.length, 4);
      
      // Title top centered
      addElement(slide.id, {
        id: uid('t'), type: 'text', x: 55, y: 30, width: 1170, height: 70,
        content: selected.title,
        textStyle: { fontSize: 46, fontWeight: 'bold', color: WHITE, textAlign: 'center', lineHeight: 1.15, fontFamily: H },
        zIndex: 10,
      } as any);

      if (count >= 3) {
        // Layout: 1 large left, 2 smaller stacked right
        const mainImg = imgs[0];
        const rightTopImg = imgs[1];
        const rightBotImg = imgs[2];

        // Large left
        addElement(slide.id, {
          id: uid('img-1'), type: 'image', x: 55, y: 120, width: 730, height: 550, src: mainImg, zIndex: 5,
        } as any);
        
        // Right top
        addElement(slide.id, {
          id: uid('img-2'), type: 'image', x: 805, y: 120, width: 420, height: 265, src: rightTopImg, zIndex: 5,
        } as any);
        
        // Right bottom
        addElement(slide.id, {
          id: uid('img-3'), type: 'image', x: 805, y: 405, width: 420, height: 265, src: rightBotImg, zIndex: 5,
        } as any);
        
      } else if (count === 2) {
        // Layout: 50/50 split
        addElement(slide.id, {
          id: uid('img-1'), type: 'image', x: 55, y: 120, width: 575, height: 550, src: imgs[0], zIndex: 5,
        } as any);
        addElement(slide.id, {
          id: uid('img-2'), type: 'image', x: 650, y: 120, width: 575, height: 550, src: imgs[1], zIndex: 5,
        } as any);
      } else if (count === 1) {
        // Layout: 1 centered large
        addElement(slide.id, {
          id: uid('img-1'), type: 'image', x: 140, y: 120, width: 1000, height: 550, src: imgs[0], zIndex: 5,
        } as any);
      }
    }


    setInserted(true);
    setTimeout(() => setInserted(false), 2200);
  }, [selected, insertMode, getSlide, addElement, updateSlide]);

  const handleInsertGalleryImage = useCallback((url: string) => {
    const slide = getSlide();
    if (!slide) return;
    const id = `el-wiki-gal-${Date.now()}`;
    addElement(slide.id, {
      id,
      type: 'image',
      x: 240, y: 160,
      width: 800, height: 450,
      src: url,
      zIndex: 100,
    } as any);
    setInserted(true);
    setTimeout(() => setInserted(false), 2200);
  }, [getSlide, addElement]);

  const hasImage  = !!(selected && (hdImageUrl(selected) || (selected.galleryUrls && selected.galleryUrls.length > 0)));
  const canInsert = insertMode === 'image-only' ? hasImage
    : insertMode === 'split-detail' ? hasImage
    : insertMode === 'photo-collage' ? hasImage
    : !!selected;
  const currentLang = LANGS.find((l) => l.code === lang) ?? LANGS[0];
  const activeModeConfig = INSERT_MODES.find((m) => m.id === insertMode) ?? INSERT_MODES[0];
  const fullArticleText = selected?.fullText?.trim() || '';
  const hasLongerArticle = fullArticleText.length > (selected?.extract?.length ?? 0) + 80;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-white border-b border-neutral-100 px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 flex items-center justify-center">
              <BookOpen size={15} className="text-neutral-500" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-[13px] font-bold text-neutral-900 leading-none tracking-tight">Wikipedia</h2>
              <p className="text-[10px] text-neutral-400 mt-0.5 font-semibold tracking-wide">Rich Knowledge → Slides</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowLangPicker((v) => !v)}
                className="flex items-center gap-1.5 h-7 px-2 rounded-lg border border-neutral-200 bg-neutral-50 text-[11px] font-bold text-neutral-500 hover:bg-neutral-100 hover:border-neutral-300 transition-all"
              >
                <Globe size={10} className="text-neutral-400" />
                {currentLang.short}
              </button>
              <AnimatePresence>
                {showLangPicker && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-9 z-50 w-36 bg-white rounded-xl shadow-xl overflow-hidden border border-neutral-200"
                  >
                    {LANGS.map((l) => (
                      <button key={l.code}
                        onClick={() => {
                          patchWikipedia({
                            lang: l.code,
                            results: [],
                            selected: null,
                            view: 'home',
                          });
                          setShowLangPicker(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 text-[12px] font-semibold flex items-center gap-2 transition-colors ${
                          lang === l.code ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <span>{l.flag}</span>
                        {l.label}
                        {lang === l.code && <CheckCircle2 size={11} className="ml-auto text-white opacity-70" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {onClose && (
              <button onClick={onClose}
                className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all flex items-center justify-center">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { patchWikipedia({ query: e.target.value }); fetchPredictions(e.target.value); }}
              onFocus={() => { if (predictions.length > 0) setShowPredictions(true); }}
              onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder={`Search ${currentLang.label} Wikipedia…`}
              className="w-full h-10 bg-neutral-50 border border-neutral-200 rounded-xl pl-8 pr-3 text-[13px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 transition-all"
            />
            {showPredictions && predictions.length > 0 && (
              <div className="absolute top-12 left-0 w-full bg-white border border-neutral-200 rounded-xl shadow-lg z-50 overflow-hidden">
                {predictions.map((p) => (
                  <button key={p}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { patchWikipedia({ query: p }); setShowPredictions(false); search(p); }}
                    className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 border-b border-neutral-100 last:border-0 flex items-center gap-2 transition-colors"
                  >
                    <Search size={11} className="text-neutral-300" />
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => search()}
            disabled={!query.trim() || searchLoading}
            className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shrink-0 hover:bg-neutral-700 transition-all disabled:opacity-40 shadow-sm"
          >
            {searchLoading
              ? <Loader2 size={14} className="animate-spin text-white" />
              : <ArrowRight size={14} className="text-white" />}
          </button>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 min-h-0 bg-[#F7F8FA] ${view === 'article' ? 'flex flex-col' : 'overflow-y-auto'}`}
        style={{ scrollbarWidth: 'none' }}
        onClick={() => setShowLangPicker(false)}
      >
        <AnimatePresence mode="wait">

          {/* ── HOME ─────────────────────────────────────────────────────── */}
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-4 pt-5 pb-6">
              <div className="flex items-center gap-1.5 mb-3 px-0.5">
                <TrendingUp size={10} className="text-neutral-400" />
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.18em]">Trending Topics</p>
              </div>
              <div className="space-y-1.5">
                {TRENDING.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <motion.button key={t.label}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.035, duration: 0.22 }}
                      onClick={() => { patchWikipedia({ query: t.label }); search(t.label); }}
                      className="flex items-center gap-3 w-full text-left px-3.5 py-2.5 rounded-xl bg-white border border-neutral-200/80 hover:border-neutral-300 hover:shadow-sm transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-neutral-100">
                        <Icon size={13} strokeWidth={2} className="text-neutral-500" />
                      </div>
                      <span className="text-[13px] font-semibold text-neutral-700 group-hover:text-neutral-900 transition-colors flex-1 text-left">
                        {t.label}
                      </span>
                      <ArrowRight size={12} className="text-neutral-300 group-hover:text-neutral-500 group-hover:translate-x-0.5 transition-all" />
                    </motion.button>
                  );
                })}
              </div>

              <div className="mt-8 flex flex-col items-center text-center opacity-30">
                <BookOpen size={26} strokeWidth={1.3} className="text-neutral-400 mb-2" />
                <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                  Search any topic and build<br />detailed slides instantly
                </p>
              </div>
            </motion.div>
          )}

          {/* ── RESULTS ──────────────────────────────────────────────────── */}
          {view === 'results' && (
            <motion.div key="results" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="px-4 pt-4 pb-6">

              <div className="flex items-center justify-between mb-4">
                <button onClick={() => {
                  patchWikipedia({ view: 'home', results: [], query: '' });
                  setError('');
                }}
                  className="flex items-center gap-1 text-[12px] font-bold text-neutral-400 hover:text-neutral-800 transition-colors">
                  <ChevronLeft size={14} strokeWidth={2.5} /> Home
                </button>
                {results.length > 0 && !searchLoading && (
                  <span className="text-[11px] font-bold text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-md">
                    {results.length} results
                  </span>
                )}
              </div>

              {searchLoading && (
                <div className="flex flex-col items-center gap-3 py-14">
                  <div className="w-10 h-10 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">
                    <Loader2 size={17} className="animate-spin text-neutral-400" />
                  </div>
                  <p className="text-[12px] font-medium text-neutral-400">Searching Wikipedia…</p>
                </div>
              )}

              {error && !searchLoading && (
                <p className="text-[12px] text-neutral-400 text-center py-10">{error}</p>
              )}

              <div className="space-y-2">
                {!searchLoading && results.map((r, i) => (
                  <motion.button key={r.pageid}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => loadSummary(r.title)}
                    className="w-full text-left px-4 py-3.5 rounded-2xl bg-white border border-neutral-200 hover:border-neutral-400 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[13px] font-bold text-neutral-900 leading-snug">{r.title}</p>
                      <ArrowRight size={13} className="shrink-0 mt-0.5 text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: r.snippet.replace(/<[^>]*>/g, '') + '…' }} />
                    <div className="flex items-center gap-3 mt-2">
                      {r.wordcount && (
                        <span className="text-[10px] font-semibold text-neutral-300">{r.wordcount.toLocaleString()} words</span>
                      )}
                      {r.timestamp && (
                        <span className="text-[10px] font-semibold text-neutral-300 flex items-center gap-1">
                          <Clock size={9} /> {formatDate(r.timestamp)}
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ARTICLE ──────────────────────────────────────────────────── */}
          {view === 'article' && (
            <motion.div
              key="article"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Top nav */}
              <div className="shrink-0 z-10 flex items-center gap-2 px-4 py-2.5 bg-white border-b border-neutral-100">
                <button
                  onClick={() => patchWikipedia({ view: 'results' })}
                  className="flex items-center gap-1 text-[12px] font-bold text-neutral-500 hover:text-neutral-900 transition-colors"
                >
                  <ChevronLeft size={14} strokeWidth={2.5} /> Results
                </button>
                <div className="flex-1 min-w-0 mx-1">
                  <p className="text-[11px] font-semibold text-neutral-700 truncate">{selected?.title}</p>
                </div>
                {selected?.content_urls?.desktop?.page && (
                  <a
                    href={selected.content_urls.desktop.page}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
                    title="Open on Wikipedia"
                  >
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>

              {summaryLoading && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                    <Loader2 size={20} className="animate-spin text-neutral-400" />
                  </div>
                  <p className="text-[12px] font-medium text-neutral-500">Loading article…</p>
                </div>
              )}

              {error && !summaryLoading && (
                <p className="px-4 py-8 text-center text-[12px] text-red-500">{error}</p>
              )}

              {selected && !summaryLoading && (
                <>
                  {/* Read / Layout tabs */}
                  <div className="shrink-0 flex gap-1 px-4 pt-3 pb-2 bg-[#F7F8FA]">
                    <button
                      type="button"
                      onClick={() => patchWikipedia({ articleTab: 'read' })}
                      className={`flex-1 min-h-[36px] rounded-lg text-[12px] font-bold transition-all ${
                        articleTab === 'read'
                          ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Article
                    </button>
                    <button
                      type="button"
                      onClick={() => patchWikipedia({ articleTab: 'layout' })}
                      className={`flex-1 min-h-[36px] rounded-lg text-[12px] font-bold transition-all ${
                        articleTab === 'layout'
                          ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-neutral-200'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Slide layout
                    </button>
                  </div>

                  {/* Scrollable content */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                    {articleTab === 'read' ? (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-4">
                        {hdImageUrl(selected) && (
                          <div className="relative w-full overflow-hidden bg-neutral-900 mx-4 mt-1 rounded-xl" style={{ aspectRatio: '16/9', maxHeight: 160 }}>
                            <img src={hdImageUrl(selected)} alt={selected.title} className="w-full h-full object-cover" />
                            <div
                              className="absolute inset-0 rounded-xl"
                              style={{
                                background:
                                  'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)',
                              }}
                            />
                            <div className="absolute bottom-2 left-3 right-3">
                              <p className="text-white text-[13px] font-bold leading-tight line-clamp-2">{selected.title}</p>
                            </div>
                          </div>
                        )}

                        <div className="px-4 pt-4 space-y-4">
                          {!hdImageUrl(selected) && (
                            <h3 className="text-[17px] font-semibold text-neutral-900 leading-tight tracking-tight">
                              {selected.title}
                            </h3>
                          )}

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white text-neutral-500 rounded-md ring-1 ring-neutral-200">
                              <Clock size={9} />~{readingTime(selected.extract)} min
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white text-neutral-500 rounded-md ring-1 ring-neutral-200">
                              <Globe size={9} />{currentLang.label}
                            </span>
                            {selected.timestamp && (
                              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-white text-neutral-500 rounded-md ring-1 ring-neutral-200">
                                <Calendar size={9} />{formatDate(selected.timestamp)}
                              </span>
                            )}
                          </div>

                          {selected.description && (
                            <div className="rounded-xl bg-primary/5 border border-primary/15 px-3.5 py-3">
                              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary mb-1.5">
                                Description
                              </p>
                              <p className="text-[13px] text-neutral-800 leading-relaxed font-medium">
                                {selected.description}
                              </p>
                            </div>
                          )}

                          <div className="rounded-xl bg-white border border-neutral-200 px-3.5 py-3.5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-400 mb-2">
                              Summary
                            </p>
                            <p className="text-[13px] leading-[1.85] text-neutral-700">{selected.extract}</p>
                          </div>

                          {hasLongerArticle && (
                            <div className="rounded-xl bg-white border border-neutral-200 overflow-hidden shadow-sm">
                              <button
                                type="button"
                                onClick={() => patchWikipedia({ showFullArticle: !showFullArticle })}
                                className="w-full flex items-center justify-between gap-2 px-3.5 py-3 text-left hover:bg-neutral-50 transition-colors"
                              >
                                <span className="text-[11px] font-bold text-neutral-800">Full Wikipedia article</span>
                                <ChevronRight
                                  size={14}
                                  className={`text-neutral-400 shrink-0 transition-transform ${showFullArticle ? 'rotate-90' : ''}`}
                                />
                              </button>
                              <AnimatePresence initial={false}>
                                {showFullArticle && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-t border-neutral-100"
                                  >
                                    <div
                                      className="max-h-[min(42vh,320px)] overflow-y-auto px-3.5 py-3 text-[12.5px] leading-[1.8] text-neutral-600 whitespace-pre-wrap"
                                      style={{ scrollbarWidth: 'thin' }}
                                    >
                                      {fullArticleText}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}

                          {(() => {
                            const facts = extractKeyFacts(selected.fullText || selected.extract, 6);
                            if (!facts.length) return null;
                            return (
                              <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm">
                                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-neutral-100 bg-neutral-50">
                                  <div className="w-1 h-3.5 bg-primary rounded-full" />
                                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.16em]">
                                    Key facts
                                  </span>
                                </div>
                                <div className="divide-y divide-neutral-100">
                                  {facts.map((f, i) => (
                                    <p key={i} className="px-3 py-2.5 text-[12px] text-neutral-700 leading-relaxed">
                                      {f}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}

                          {(() => {
                            const secs = parseSections(selected.fullText || '').slice(0, 5);
                            if (!secs.length) return null;
                            return (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.16em] px-0.5">
                                  Sections
                                </p>
                                {secs.map((s, i) => (
                                  <div
                                    key={i}
                                    className="rounded-xl border border-neutral-200 bg-white px-3.5 py-3 shadow-sm"
                                  >
                                    <p className="text-[11px] font-bold text-neutral-800 uppercase tracking-wide">
                                      {s.heading || 'Overview'}
                                    </p>
                                    <p className="mt-2 text-[12px] text-neutral-600 leading-relaxed whitespace-pre-wrap">
                                      {s.body}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}

                          {selected.galleryUrls && selected.galleryUrls.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.16em] mb-2 px-0.5">
                                Media gallery ({selected.galleryUrls.length})
                              </p>
                              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                                {selected.galleryUrls.map((url, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleInsertGalleryImage(url)}
                                    className="w-32 h-24 shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 relative group shadow-sm"
                                    title="Insert this image on slide"
                                  >
                                    <img src={url} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                      <ImagePlus size={16} className="text-white" />
                                      <span className="text-[9px] font-bold text-white uppercase tracking-wide">
                                        Insert
                                      </span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 pt-1 space-y-2">
                        <p className="text-[11px] text-neutral-500 leading-relaxed">
                          Choose how this article should appear on your slide, then tap Insert below.
                        </p>
                        {INSERT_MODES.map((mode) => {
                          const Icon = mode.icon;
                          const needsImg =
                            mode.id === 'image-only' ||
                            mode.id === 'split-detail' ||
                            mode.id === 'photo-collage';
                          const disabled = needsImg && !hasImage;
                          const active = insertMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              type="button"
                              disabled={disabled}
                              onClick={() => patchWikipedia({ insertMode: mode.id })}
                              className={`flex items-center gap-3 w-full text-left px-3.5 py-3 rounded-xl border transition-all ${
                                active
                                  ? 'bg-neutral-900 border-neutral-900 shadow-md'
                                  : disabled
                                    ? 'bg-neutral-50 border-neutral-100 opacity-40 cursor-not-allowed'
                                    : 'bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-sm'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                                  active ? 'bg-white/15' : 'bg-neutral-100'
                                }`}
                              >
                                <Icon
                                  size={16}
                                  strokeWidth={1.75}
                                  className={active ? 'text-white' : 'text-neutral-500'}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-[13px] font-bold ${active ? 'text-white' : 'text-neutral-800'}`}>
                                  {mode.label}
                                </p>
                                <p className={`text-[11px] mt-0.5 leading-snug ${active ? 'text-white/60' : 'text-neutral-500'}`}>
                                  {mode.desc}
                                  {disabled ? ' · Image required' : ''}
                                </p>
                              </div>
                              {active && <CheckCircle2 size={16} className="text-white shrink-0" />}
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>

                  {/* Sticky insert bar — always visible */}
                  <div className="shrink-0 border-t border-neutral-200 bg-white px-4 pt-3 pb-4 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.12)]">
                    <div className="flex items-center gap-2 mb-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
                        <activeModeConfig.icon size={14} className="text-neutral-600" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400">
                          Selected layout
                        </p>
                        <p className="text-[12px] font-bold text-neutral-900 truncate">{activeModeConfig.label}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => patchWikipedia({ articleTab: 'layout' })}
                        className="shrink-0 text-[11px] font-bold text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>

                    <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2" style={{ scrollbarWidth: 'none' }}>
                      {INSERT_MODES.map((mode) => {
                        const Icon = mode.icon;
                        const needsImg =
                          mode.id === 'image-only' ||
                          mode.id === 'split-detail' ||
                          mode.id === 'photo-collage';
                        const disabled = needsImg && !hasImage;
                        const active = insertMode === mode.id;
                        return (
                          <button
                            key={mode.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => patchWikipedia({ insertMode: mode.id })}
                            title={mode.label}
                            className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                              active
                                ? 'bg-primary border-primary text-white'
                                : disabled
                                  ? 'bg-neutral-50 border-neutral-100 text-neutral-300 cursor-not-allowed'
                                  : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                            }`}
                          >
                            <Icon size={11} strokeWidth={1.75} />
                            <span className="whitespace-nowrap">{mode.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <AnimatePresence mode="wait">
                      {inserted ? (
                        <motion.div
                          key="done"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          className="min-h-[48px] rounded-xl bg-emerald-600 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 size={16} className="text-white" />
                          <span className="text-white font-bold text-[13px]">Added to slide</span>
                        </motion.div>
                      ) : (
                        <motion.button
                          key="insert"
                          type="button"
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={handleInsert}
                          disabled={!canInsert}
                          whileTap={{ scale: canInsert ? 0.98 : 1 }}
                          className="w-full min-h-[48px] rounded-xl bg-primary text-white font-bold text-[14px] hover:opacity-95 transition-all disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-primary/20"
                        >
                          <Layers size={16} strokeWidth={2} />
                          Insert into slide
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
