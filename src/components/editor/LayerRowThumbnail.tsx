/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useMemo } from 'react';
import type { SlideElement } from '@/types';
import { editorImageFetchUrl } from '@/lib/r2-public-url';
import { Type, ImageIcon, Square, Sparkles } from 'lucide-react';

const FRAME = 44;

function FallbackIcon({ el }: { el: SlideElement }) {
  switch (el.type) {
    case 'text':   return <Type size={16} className="text-neutral-500" strokeWidth={1.5} />;
    case 'image':  return <ImageIcon size={16} className="text-neutral-500" strokeWidth={1.5} />;
    case 'icon':   return <Sparkles size={16} className="text-neutral-500" strokeWidth={1.5} />;
    default:       return <Square size={16} className="text-neutral-500" strokeWidth={1.5} />;
  }
}

function ShapePreview({ el }: { el: SlideElement }) {
  const ss = el.shapeStyle || {};
  const fill = ss.fill || '#7B61FF';
  const stroke = ss.stroke || 'transparent';
  const sw = ss.strokeWidth || 0;
  const rot = el.rotation ? `rotate(${el.rotation}deg)` : undefined;

  if (el.shapeType === 'triangle') {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ transform: rot }}>
        <div style={{ width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderBottom: `24px solid ${fill}`, filter: sw > 0 ? `drop-shadow(0 0 1px ${stroke})` : undefined }} />
      </div>
    );
  }
  if (el.shapeType === 'star') {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ transform: rot }}>
        <svg width="28" height="28" viewBox="0 0 24 24">
          <polygon points="12,2 15,9 22,9 17,14 19,22 12,18 5,22 7,14 2,9 9,9" fill={fill} stroke={sw > 0 ? stroke : 'none'} strokeWidth={sw > 0 ? Math.min(sw, 2) : 0} />
        </svg>
      </div>
    );
  }
  const r = el.shapeType === 'circle' ? '50%' : `${ss.cornerRadius || 0}px`;
  return <div className="h-full w-full" style={{ background: fill, borderRadius: r, border: sw > 0 ? `${Math.min(sw, 3)}px solid ${stroke}` : 'none', opacity: el.opacity ?? 1, transform: rot }} />;
}

// ─── Text Thumbnail ────────────────────────────────────────────────────────────
function TextThumbnail({ el }: { el: SlideElement }) {
  const ts = el.textStyle || {};
  const text = (el.content || '').trim();
  const bgColor = ts.color && ts.color.toLowerCase() === '#ffffff' ? '#1a1a2e' : '#f8f9fa';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-1 overflow-hidden"
      style={{ background: bgColor, borderRadius: 10 }}
    >
      <span
        className="text-center leading-tight w-full"
        style={{
          fontSize: 9,
          fontFamily: ts.fontFamily ? `${ts.fontFamily}, sans-serif` : 'Inter, sans-serif',
          fontWeight: ts.fontWeight === 'bold' ? 700 : 400,
          fontStyle: ts.fontStyle === 'italic' ? 'italic' : 'normal',
          color: ts.color || '#1a1a1a',
          ...(ts.color?.toLowerCase() === bgColor.toLowerCase() ? { color: bgColor === '#f8f9fa' ? '#1a1a1a' : '#ffffff' } : {}),
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          wordBreak: 'break-word',
          opacity: el.opacity ?? 1,
        }}
      >
        {text || 'T'}
      </span>
    </div>
  );
}

export function LayerRowThumbnail({ el }: { el: SlideElement }) {
  const [imgErr, setImgErr] = useState(false);

  const shapeScale = useMemo(() => {
    if (el.type !== 'shape') return 1;
    const w = Math.max(el.width || 1, 1);
    const h = Math.max(el.height || 1, 1);
    const usable = FRAME - 8;
    return Math.min(usable / w, usable / h, 1);
  }, [el.type, el.width, el.height]);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-neutral-200/80 bg-neutral-100"
      style={{ width: FRAME, height: FRAME }}
    >
      {/* Text: clean label preview */}
      {el.type === 'text' && <TextThumbnail el={el} />}

      {/* Image: show actual image */}
      {el.type === 'image' && el.src && !imgErr && (
        <img
          src={editorImageFetchUrl(el.src)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: el.opacity ?? 1 }}
          onError={() => setImgErr(true)}
        />
      )}

      {/* Image broken/missing */}
      {el.type === 'image' && (!el.src || imgErr) && (
        <div className="flex h-full w-full items-center justify-center bg-neutral-100">
          <FallbackIcon el={el} />
        </div>
      )}

      {/* Shape: scaled preview */}
      {el.type === 'shape' && (
        <div className="absolute inset-0 flex items-center justify-center p-1.5">
          <div
            className="w-full h-full"
            style={{ transform: `scale(${shapeScale})`, transformOrigin: 'center' }}
          >
            <ShapePreview el={el} />
          </div>
        </div>
      )}

      {/* Icon / other */}
      {el.type !== 'text' && el.type !== 'image' && el.type !== 'shape' && (
        <div className="flex h-full w-full items-center justify-center bg-white">
          <FallbackIcon el={el} />
        </div>
      )}
    </div>
  );
}
