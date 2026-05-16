import type { ReactNode } from 'react';
import { createElement, Fragment } from 'react';

export type OutlineSlide = {
  number: number;
  title: string;
  description?: string;
  type?: string;
};

type Message = { role: string; content: string };

const SLIDE_LINE =
  /^(?:[-*•]\s*)?(?:\*\*)?Slide\s*(\d+)\s*[:.)-]\s*(.+?)(?:\*\*)?(?:\s*[—–-]\s*(.+))?$/i;

const HEADING_SLIDE_LINE =
  /^#{1,3}\s*(?:\*\*)?Slide\s*(\d+)\s*[:.)-]\s*(.+?)(?:\*\*)?(?:\s*[—–-]\s*(.+))?$/i;

const NUMBERED_LINE =
  /^(?:[-*•]\s*)?(?:\*\*)?(\d+)\s*[.)]\s*(.+?)(?:\*\*)?(?:\s*[—–-]\s*(.+))?$/i;

const TYPE_KEYWORDS: Record<string, string> = {
  problem: 'Problem',
  solution: 'Solution',
  title: 'Title',
  intro: 'Intro',
  cta: 'CTA',
  'call to action': 'CTA',
  data: 'Data',
  quote: 'Quote',
  conclusion: 'Closing',
  closing: 'Closing',
  summary: 'Summary',
  market: 'Market',
  team: 'Team',
};

function detectSlideType(title: string): string | undefined {
  const lower = title.toLowerCase();
  for (const [key, label] of Object.entries(TYPE_KEYWORDS)) {
    if (lower.includes(key)) return label;
  }
  return undefined;
}

function normalizeSlideMatch(
  num: number,
  rawTitle: string,
  rawDescription?: string,
): OutlineSlide | null {
  if (!Number.isFinite(num) || num < 1 || num > 50) return null;

  let title = rawTitle.replace(/\*\*/g, '').trim();
  let description = rawDescription?.replace(/\*\*/g, '').trim();

  const emDash = title.match(/^(.+?)\s*[—–-]\s*(.+)$/);
  if (emDash && !description) {
    title = emDash[1].trim();
    description = emDash[2].trim();
  }

  if (!title) return null;

  return {
    number: num,
    title,
    description: description || undefined,
    type: detectSlideType(title),
  };
}

function tryParseSlideLine(line: string): OutlineSlide | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  for (const re of [SLIDE_LINE, HEADING_SLIDE_LINE, NUMBERED_LINE]) {
    const match = trimmed.match(re);
    if (!match) continue;

    const num = parseInt(match[1], 10);
    const slide = normalizeSlideMatch(num, match[2], match[3]);
    if (slide) return slide;
  }

  return null;
}

/** True if this line is a parseable slide outline line. */
export function isOutlineSlideLine(line: string): boolean {
  return tryParseSlideLine(line) !== null;
}

/** Extract slide cards from assistant markdown/text. */
export function parseSlideOutline(content: string): OutlineSlide[] {
  if (!content?.trim()) return [];

  const byNumber = new Map<number, OutlineSlide>();

  for (const line of content.split('\n')) {
    const slide = tryParseSlideLine(line);
    if (slide) byNumber.set(slide.number, slide);
  }

  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}

/** Merge slides from all assistant messages (later overrides same slide number). */
export function getMergedOutlineSlides(messages: Message[]): OutlineSlide[] {
  const byNumber = new Map<number, OutlineSlide>();

  for (const msg of messages) {
    if (msg.role !== 'assistant' || !msg.content.trim()) continue;
    for (const slide of parseSlideOutline(msg.content)) {
      byNumber.set(slide.number, slide);
    }
  }

  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}

/** Remove slide outline lines for chat display (intro/closing narrative only). */
export function stripOutlineLinesForDisplay(content: string): string {
  if (!content?.trim()) return '';

  const kept: string[] = [];
  for (const line of content.split('\n')) {
    if (isOutlineSlideLine(line)) continue;
    kept.push(line);
  }

  return kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Latest assistant message for outline panel. */
export function getLatestAssistantContent(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].content.trim()) {
      return messages[i].content;
    }
  }
  return '';
}

export function getOutlineProgress(
  slides: OutlineSlide[],
  loading: boolean,
): { count: number; isStreaming: boolean; target: number } {
  const target = Math.max(8, slides.length || 8);
  return {
    count: slides.length,
    isStreaming: loading,
    target,
  };
}

/** Structured outline block for editor copilot context. */
export function formatOutlineForContext(slides: OutlineSlide[]): string {
  if (!slides.length) return '';

  const lines = slides.map((s) => {
    const desc = s.description ? ` — ${s.description}` : '';
    const type = s.type ? ` [${s.type}]` : '';
    return `Slide ${s.number}: ${s.title}${desc}${type}`;
  });

  return `STRUCTURED OUTLINE:\n${lines.join('\n')}`;
}

type Block =
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] };

function parseBlocks(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    const ulMatch = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ulMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*•]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }

    const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
    if (olMatch) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^\d+[.)]\s+(.+)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length && lines[i].trim() && !/^#{1,3}\s/.test(lines[i].trim())) {
      const next = lines[i].trim();
      if (/^[-*•]\s/.test(next) || /^\d+[.)]\s/.test(next)) break;
      paraLines.push(next);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: paraLines.join(' ') });
  }

  return blocks;
}

function inlineFormat(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    parts.push(
      createElement('strong', { key: key++, className: 'font-semibold text-slate-900' }, match[1]),
    );
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : [text];
}

/** Lightweight markdown → React (bold, headings, lists). */
export function renderMarkdownLite(text: string): ReactNode {
  if (!text?.trim()) return null;

  const blocks = parseBlocks(text);

  return createElement(
    Fragment,
    null,
    blocks.map((block, idx) => {
      switch (block.kind) {
        case 'heading': {
          const Tag = block.level === 1 ? 'h3' : block.level === 2 ? 'h4' : 'h5';
          const size =
            block.level === 1
              ? 'text-base font-bold text-slate-900 mt-4 mb-2'
              : 'text-sm font-bold text-slate-900 mt-3 mb-1.5';
          return createElement(Tag, { key: idx, className: size }, ...inlineFormat(block.text));
        }
        case 'ul':
          return createElement(
            'ul',
            { key: idx, className: 'my-2 ml-4 list-disc space-y-1 text-[14px] text-slate-700' },
            block.items.map((item, j) =>
              createElement('li', { key: j }, ...inlineFormat(item)),
            ),
          );
        case 'ol':
          return createElement(
            'ol',
            { key: idx, className: 'my-2 ml-4 list-decimal space-y-1 text-[14px] text-slate-700' },
            block.items.map((item, j) =>
              createElement('li', { key: j }, ...inlineFormat(item)),
            ),
          );
        default:
          return createElement(
            'p',
            {
              key: idx,
              className:
                'text-[14px] leading-relaxed text-slate-700 my-2 first:mt-0 last:mb-0',
            },
            ...inlineFormat(block.text),
          );
      }
    }),
  );
}

export const QUICK_REPLIES = [
  'Make the deck shorter',
  'Add a data slide',
  'Stronger opening',
  'Target investors',
] as const;
