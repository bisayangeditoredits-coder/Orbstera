'use client';

import { useState, useMemo } from 'react';
import type { SlideElement } from '@/types';
import { Type, Image, Square, BarChart2, Sparkles } from 'lucide-react';

const FRAME = 44;
const PAD = 0.9;

function FallbackIcon({ el }: { el: SlideElement }) {
  switch (el.type) {
    case 'text':
      return <Type size={18} className="text-neutral-400" strokeWidth={1.75} />;
    case 'image':
      return <Image size={18} className="text-neutral-400" strokeWidth={1.75} />;
    case 'chart':
      return <BarChart2 size={18} className="text-neutral-400" strokeWidth={1.75} />;
    case 'icon':
      return <Sparkles size={18} className="text-neutral-400" strokeWidth={1.75} />;
    default:
      return <Square size={18} className="text-neutral-400" strokeWidth={1.75} />;
  }
}

function MiniChart({ el }: { el: SlideElement }) {
  const chart = el.chartData;
  if (!chart?.datasets?.[0]?.data?.length) {
    return <BarChart2 size={18} className="text-neutral-400" strokeWidth={1.75} />;
  }
  const data = chart.datasets[0].data.slice(0, 5);
  const colors = chart.datasets[0].backgroundColor;
  const max = Math.max(...data.map((d) => Math.abs(d)), 1);
  return (
    <div className="flex items-end justify-center gap-0.5 h-7 px-1">
      {data.map((v, i) => {
        const h = Math.max(2, Math.round((Math.abs(v) / max) * 22));
        const bg = Array.isArray(colors) ? colors[i % colors.length] : colors || '#7B61FF';
        return (
          <div
            key={i}
            className="w-1.5 rounded-sm shrink-0"
            style={{ height: h, background: typeof bg === 'string' ? bg : '#7B61FF' }}
          />
        );
      })}
    </div>
  );
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
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: '18px solid transparent',
            borderRight: '18px solid transparent',
            borderBottom: `31px solid ${fill}`,
            filter: sw > 0 ? `drop-shadow(0 0 1px ${stroke})` : undefined,
          }}
        />
      </div>
    );
  }

  if (el.shapeType === 'star') {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ transform: rot }}>
        <svg width="36" height="36" viewBox="0 0 24 24">
          <polygon
            points="12,2 15,9 22,9 17,14 19,22 12,18 5,22 7,14 2,9 9,9"
            fill={fill}
            stroke={sw > 0 ? stroke : 'none'}
            strokeWidth={sw > 0 ? Math.min(sw, 2) : 0}
          />
        </svg>
      </div>
    );
  }

  const r = el.shapeType === 'circle' ? '50%' : `${ss.cornerRadius || 0}px`;

  return (
    <div
      className="h-full w-full"
      style={{
        background: fill,
        borderRadius: r,
        border: sw > 0 ? `${Math.min(sw, 4)}px solid ${stroke}` : 'none',
        opacity: el.opacity ?? 1,
        transform: rot,
      }}
    />
  );
}

export function LayerRowThumbnail({ el }: { el: SlideElement }) {
  const [imgErr, setImgErr] = useState(false);

  const { w, h, scale } = useMemo(() => {
    const width = Math.max(el.width || 1, 1);
    const height = Math.max(el.height || 1, 1);
    const s = Math.min((FRAME * PAD) / width, (FRAME * PAD) / height);
    return { w: width, h: height, scale: s };
  }, [el.width, el.height]);

  const stage = (
    <div
      className="absolute left-1/2 top-1/2 overflow-hidden"
      style={{
        width: w,
        height: h,
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      {el.type === 'text' && (
        <div
          className="rounded-sm bg-neutral-900"
          style={{
            width: w,
            height: h,
            fontSize: el.textStyle?.fontSize || 24,
            color: el.textStyle?.color || '#FFFFFF',
            fontWeight: el.textStyle?.fontWeight || 'normal',
            fontStyle: el.textStyle?.fontStyle || 'normal',
            fontFamily: el.textStyle?.fontFamily ? `${el.textStyle.fontFamily}, sans-serif` : 'Inter, sans-serif',
            textAlign: (el.textStyle?.textAlign as React.CSSProperties['textAlign']) || 'left',
            lineHeight: el.textStyle?.lineHeight || 1.35,
            opacity: el.opacity ?? 1,
            overflow: 'hidden',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            display: '-webkit-box',
            WebkitLineClamp: 5,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {(el.content || '').trim() || '\u00a0'}
        </div>
      )}

      {el.type === 'image' && el.src && !imgErr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={el.src}
          alt=""
          className="h-full w-full object-cover"
          style={{
            opacity: el.opacity ?? 1,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
          }}
          onError={() => setImgErr(true)}
        />
      )}

      {el.type === 'shape' && <ShapePreview el={el} />}
    </div>
  );

  const needsStage = el.type === 'text' || el.type === 'image' || el.type === 'shape';
  const imageBroken = el.type === 'image' && (!el.src || imgErr);

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-xl border border-neutral-200/90 bg-neutral-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
      style={{
        width: FRAME,
        height: FRAME,
        backgroundImage:
          'linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)',
        backgroundSize: '8px 8px',
        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
      }}
    >
      {needsStage && !imageBroken ? (
        stage
      ) : el.type === 'chart' ? (
        <div className="flex h-full w-full items-center justify-center bg-white/80">
          <MiniChart el={el} />
        </div>
      ) : el.type === 'icon' ? (
        <div className="flex h-full w-full items-center justify-center bg-white/80">
          <Sparkles size={20} className="text-violet-500" strokeWidth={1.75} />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-white/80">
          <FallbackIcon el={el} />
        </div>
      )}
    </div>
  );
}
