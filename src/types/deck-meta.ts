export type ShareAccess = 'private' | 'public_view';

export interface DeckMeta {
  id: string;
  title: string;
  shareAccess?: ShareAccess;
  date: string;
  createdAt?: string;
  slidesCount: number;
  theme: string;
  colorPalette: string[];
  subtitle?: string;
  thumbnailUrl?: string;
  firstSlideTitle?: string;
  firstSlideSubtitle?: string;
  firstSlideBackgroundStyle?: string;
}
