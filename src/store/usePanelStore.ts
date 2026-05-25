import { create } from 'zustand';

// ─── Shared panel UI types (lightweight — no React trees) ─────────────────────

export type UnsplashPhotoPersisted = {
  id: string;
  urls: { regular: string; small: string; full: string };
  alt_description: string;
  width: number;
  height: number;
  user: { name: string };
};

export type GiphyGifPersisted = {
  id: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    original: { url: string; width: string; height: string };
  };
  title: string;
};

export type WikiView = 'home' | 'results' | 'article';

export type WikiInsertMode =
  | 'rich-detail'
  | 'split-detail'
  | 'info-grid'
  | 'full-slide'
  | 'title-body'
  | 'title-only'
  | 'image-only'
  | 'photo-collage';

export type WikiSearchResultPersisted = {
  pageid: number;
  title: string;
  snippet: string;
  wordcount?: number;
  timestamp?: string;
};

export type WikiSummaryPersisted = {
  title: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  content_urls?: { desktop?: { page?: string } };
  lang?: string;
  timestamp?: string;
  description?: string;
  fullText?: string;
  galleryUrls?: string[];
};

export type PhotosPanelPersisted = {
  query: string;
  lastSearchedQuery: string;
  photos: UnsplashPhotoPersisted[];
  page: number;
  hasMore: boolean;
};

export type IconsPanelPersisted = {
  query: string;
  iconifyIcons: string[];
};

export type GiphyPanelPersisted = {
  query: string;
  gifs: GiphyGifPersisted[];
  offset: number;
  hasMore: boolean;
  mode: 'gifs' | 'stickers';
};

export type WikipediaPanelPersisted = {
  query: string;
  lang: string;
  results: WikiSearchResultPersisted[];
  selected: WikiSummaryPersisted | null;
  view: WikiView;
  insertMode: WikiInsertMode;
  showFullArticle: boolean;
  articleTab: 'read' | 'layout';
};

export type PollinationsPanelPersisted = {
  prompt: string;
  selectedStyleValue: string;
  imageUrl: string | null;
  seed: number;
};

type PanelStoreState = {
  photos: PhotosPanelPersisted;
  icons: IconsPanelPersisted;
  giphy: GiphyPanelPersisted;
  wikipedia: WikipediaPanelPersisted;
  pollinations: PollinationsPanelPersisted;
  patchPhotos: (patch: Partial<PhotosPanelPersisted>) => void;
  patchIcons: (patch: Partial<IconsPanelPersisted>) => void;
  patchGiphy: (patch: Partial<GiphyPanelPersisted>) => void;
  patchWikipedia: (patch: Partial<WikipediaPanelPersisted>) => void;
  patchPollinations: (patch: Partial<PollinationsPanelPersisted>) => void;
  resetPanelUiState: () => void;
};

const DEFAULT_PHOTOS: PhotosPanelPersisted = {
  query: '',
  lastSearchedQuery: 'abstract background',
  photos: [],
  page: 1,
  hasMore: true,
};

const DEFAULT_ICONS: IconsPanelPersisted = {
  query: '',
  iconifyIcons: [],
};

const DEFAULT_GIPHY: GiphyPanelPersisted = {
  query: '',
  gifs: [],
  offset: 0,
  hasMore: true,
  mode: 'gifs',
};

const DEFAULT_WIKIPEDIA: WikipediaPanelPersisted = {
  query: '',
  lang: 'en',
  results: [],
  selected: null,
  view: 'home',
  insertMode: 'rich-detail',
  showFullArticle: false,
  articleTab: 'read',
};

const DEFAULT_POLLINATIONS: PollinationsPanelPersisted = {
  prompt: '',
  selectedStyleValue: 'realistic photo, ultra detailed, 8k',
  imageUrl: null,
  seed: Math.floor(Math.random() * 99999),
};

export const usePanelStore = create<PanelStoreState>((set) => ({
  photos: { ...DEFAULT_PHOTOS },
  icons: { ...DEFAULT_ICONS },
  giphy: { ...DEFAULT_GIPHY },
  wikipedia: { ...DEFAULT_WIKIPEDIA },
  pollinations: { ...DEFAULT_POLLINATIONS },

  patchPhotos: (patch) =>
    set((s) => ({ photos: { ...s.photos, ...patch } })),

  patchIcons: (patch) =>
    set((s) => ({ icons: { ...s.icons, ...patch } })),

  patchGiphy: (patch) =>
    set((s) => ({ giphy: { ...s.giphy, ...patch } })),

  patchWikipedia: (patch) =>
    set((s) => ({ wikipedia: { ...s.wikipedia, ...patch } })),

  patchPollinations: (patch) =>
    set((s) => ({ pollinations: { ...s.pollinations, ...patch } })),

  resetPanelUiState: () =>
    set({
      photos: { ...DEFAULT_PHOTOS },
      icons: { ...DEFAULT_ICONS },
      giphy: { ...DEFAULT_GIPHY },
      wikipedia: { ...DEFAULT_WIKIPEDIA },
      pollinations: {
        ...DEFAULT_POLLINATIONS,
        seed: Math.floor(Math.random() * 99999),
      },
    }),
}));
