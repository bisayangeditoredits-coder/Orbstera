/**
 * Fields merged into R2 `index.json` for each deck — used by the dashboard for thumbnails
 * without loading full presentation JSON.
 */

type SlideLike = {
  title?: string;
  subtitle?: string;
  imageUrl?: string;
  backgroundStyle?: string;
  elements?: Array<{ type?: string; src?: string }>;
};

/** Accepts parsed presentation JSON from the client — only reads `slides[0]` safely. */
export function deriveDeckIndexThumbFields(presentation: { slides?: unknown[] }) {
  const first = presentation.slides?.[0] as SlideLike | undefined;
  let thumbnailUrl: string | undefined;

  if (first?.imageUrl && /^https?:\/\//i.test(first.imageUrl)) {
    thumbnailUrl = first.imageUrl;
  } else if (Array.isArray(first?.elements) && first.elements.length) {
    for (const el of first.elements) {
      if (el?.type !== 'image' || typeof el.src !== 'string') continue;
      const s = el.src.trim();
      if (/^https?:\/\//i.test(s) && !/^PROMPT:/i.test(s)) {
        thumbnailUrl = s;
        break;
      }
    }
  }

  return {
    thumbnailUrl,
    firstSlideTitle: typeof first?.title === 'string' ? first.title : '',
    firstSlideSubtitle: typeof first?.subtitle === 'string' ? first.subtitle : '',
    firstSlideBackgroundStyle:
      typeof first?.backgroundStyle === 'string' ? first.backgroundStyle : '',
  };
}
