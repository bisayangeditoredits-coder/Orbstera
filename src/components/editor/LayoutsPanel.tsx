'use client';

import { usePresentationStore } from '@/store/usePresentationStore';
import { motion } from 'framer-motion';
import { Layout, Columns, Image as ImageIcon, LayoutGrid, LayoutList, AlignLeft } from 'lucide-react';

const CANVAS_W = 1280;
const CANVAS_H = 720;
const IMG_PLACEHOLDER = 'https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=800&auto=format&fit=crop';

const LAYOUTS = [
  {
    id: 'hero',
    name: 'Hero Title',
    thumbnail: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
        <div className="w-3/4 h-2 bg-indigo-500 rounded-sm" />
        <div className="w-1/2 h-1 bg-neutral-300 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        {
          id: uid(), type: 'text', x: 80, y: CANVAS_H / 2 - 80, width: CANVAS_W - 160, height: 160, content: 'Hero Title', zIndex: z, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 84, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.1 },
        },
        {
          id: uid(), type: 'text', x: 200, y: CANVAS_H / 2 + 80, width: CANVAS_W - 400, height: 80, content: 'Subtitle goes here', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 28, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'center', lineHeight: 1.5, letterSpacing: 1.5 },
        }
      ];
    }
  },
  {
    id: 'split-left-img',
    name: 'Image Left, Text Right',
    thumbnail: (
      <div className="w-full h-full flex items-center justify-between gap-1 opacity-80 group-hover:opacity-100">
        <div className="w-1/2 h-full bg-neutral-200 rounded-sm" />
        <div className="w-1/2 h-full flex flex-col justify-center gap-1 p-1">
          <div className="w-full h-1.5 bg-indigo-500 rounded-sm" />
          <div className="w-3/4 h-1 bg-neutral-300 rounded-sm" />
          <div className="w-3/4 h-1 bg-neutral-300 rounded-sm" />
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        {
          id: uid(), type: 'image', x: 40, y: 40, width: 580, height: CANVAS_H - 80, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER,
        },
        {
          id: uid(), type: 'text', x: 680, y: 220, width: 520, height: 120, content: 'Section Title', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 680, y: 350, width: 60, height: 4, zIndex: z + 2, visible: true, locked: false,
          shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 },
        },
        {
          id: uid(), type: 'text', x: 680, y: 380, width: 520, height: 150, content: 'Add your supporting text here. This layout gives equal weight to visual and textual content.', zIndex: z + 3, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.5 },
        }
      ];
    }
  },
  {
    id: 'split-right-img',
    name: 'Text Left, Image Right',
    thumbnail: (
      <div className="w-full h-full flex items-center justify-between gap-1 opacity-80 group-hover:opacity-100">
        <div className="w-1/2 h-full flex flex-col justify-center gap-1 p-1">
          <div className="w-full h-1.5 bg-indigo-500 rounded-sm" />
          <div className="w-3/4 h-1 bg-neutral-300 rounded-sm" />
          <div className="w-3/4 h-1 bg-neutral-300 rounded-sm" />
        </div>
        <div className="w-1/2 h-full bg-neutral-200 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        {
          id: uid(), type: 'text', x: 80, y: 220, width: 520, height: 120, content: 'Section Title', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 80, y: 350, width: 60, height: 4, zIndex: z + 2, visible: true, locked: false,
          shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 },
        },
        {
          id: uid(), type: 'text', x: 80, y: 380, width: 520, height: 150, content: 'Add your supporting text here. This layout gives equal weight to visual and textual content.', zIndex: z + 3, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.5 },
        },
        {
          id: uid(), type: 'image', x: 660, y: 40, width: 580, height: CANVAS_H - 80, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER,
        }
      ];
    }
  },
  {
    id: 'three-col',
    name: 'Three Columns',
    thumbnail: (
      <div className="w-full h-full flex flex-col justify-between gap-1 p-0.5 opacity-80 group-hover:opacity-100">
        <div className="w-1/3 h-1.5 bg-indigo-500 rounded-sm mx-auto" />
        <div className="flex gap-1 h-full pb-1">
          <div className="flex-1 bg-neutral-200 rounded-sm" />
          <div className="flex-1 bg-neutral-200 rounded-sm" />
          <div className="flex-1 bg-neutral-200 rounded-sm" />
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        {
          id: uid(), type: 'text', x: 80, y: 60, width: CANVAS_W - 160, height: 80, content: 'Three Points', zIndex: z, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.2 },
        },
        { id: uid(), type: 'image', x: 80, y: 180, width: 346, height: 260, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'text', x: 80, y: 470, width: 346, height: 50, content: 'Point One', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 28, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 80, y: 530, width: 346, height: 100, content: 'Description for the first point.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 20, color: palette[3] || palette[1], textAlign: 'center' } },
        
        { id: uid(), type: 'image', x: 466, y: 180, width: 346, height: 260, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'text', x: 466, y: 470, width: 346, height: 50, content: 'Point Two', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 28, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 466, y: 530, width: 346, height: 100, content: 'Description for the second point.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 20, color: palette[3] || palette[1], textAlign: 'center' } },
        
        { id: uid(), type: 'image', x: 852, y: 180, width: 346, height: 260, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'text', x: 852, y: 470, width: 346, height: 50, content: 'Point Three', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 28, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 852, y: 530, width: 346, height: 100, content: 'Description for the third point.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 20, color: palette[3] || palette[1], textAlign: 'center' } },
      ];
    }
  },
  {
    id: 'four-grid',
    name: '2x2 Image Grid',
    thumbnail: (
      <div className="w-full h-full flex flex-col gap-0.5 opacity-80 group-hover:opacity-100">
        <div className="flex gap-0.5 h-1/2">
          <div className="flex-1 bg-neutral-200 rounded-sm" />
          <div className="flex-1 bg-neutral-200 rounded-sm" />
        </div>
        <div className="flex gap-0.5 h-1/2">
          <div className="flex-1 bg-neutral-200 rounded-sm" />
          <div className="flex-1 bg-neutral-200 rounded-sm" />
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        { id: uid(), type: 'image', x: 40, y: 40, width: 580, height: 300, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'image', x: 660, y: 40, width: 580, height: 300, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'image', x: 40, y: 380, width: 580, height: 300, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'image', x: 660, y: 380, width: 580, height: 300, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
      ];
    }
  },
  {
    id: 'bento',
    name: 'Bento Grid',
    thumbnail: (
      <div className="w-full h-full flex flex-col justify-between gap-1 p-0.5 opacity-80 group-hover:opacity-100">
        <div className="w-1/2 h-1.5 bg-indigo-500 rounded-sm" />
        <div className="flex gap-1 h-full">
          <div className="flex-1 bg-neutral-200 rounded-sm" />
          <div className="flex-[1.5] flex flex-col gap-1">
            <div className="flex-1 bg-neutral-200 rounded-sm" />
            <div className="flex-1 bg-neutral-200 rounded-sm" />
          </div>
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        {
          id: uid(), type: 'text', x: 80, y: 60, width: CANVAS_W - 160, height: 80, content: 'Key Highlights', zIndex: z, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
        },
        {
          id: uid(), type: 'image', x: 80, y: 160, width: 540, height: 480, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER,
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 640, y: 160, width: 560, height: 230, zIndex: z, visible: true, locked: false,
          shapeStyle: { fill: 'rgba(255, 255, 255, 0.05)', stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, cornerRadius: 24 },
        },
        {
          id: uid(), type: 'text', x: 680, y: 200, width: 480, height: 40, content: 'Metric 1', zIndex: z+1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 32, fontWeight: 'bold', color: palette[1], textAlign: 'left' },
        },
        {
          id: uid(), type: 'text', x: 680, y: 250, width: 480, height: 80, content: 'Detailed information about this specific highlight.', zIndex: z+1, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 20, color: palette[3] || palette[1], textAlign: 'left' },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 640, y: 410, width: 560, height: 230, zIndex: z, visible: true, locked: false,
          shapeStyle: { fill: 'rgba(255, 255, 255, 0.05)', stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1, cornerRadius: 24 },
        },
        {
          id: uid(), type: 'text', x: 680, y: 450, width: 480, height: 40, content: 'Metric 2', zIndex: z+1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 32, fontWeight: 'bold', color: palette[1], textAlign: 'left' },
        },
        {
          id: uid(), type: 'text', x: 680, y: 500, width: 480, height: 80, content: 'Detailed information about this specific highlight.', zIndex: z+1, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 20, color: palette[3] || palette[1], textAlign: 'left' },
        },
      ];
    }
  },
  {
    id: 'quote',
    name: 'Big Quote',
    thumbnail: (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 opacity-80 group-hover:opacity-100">
        <div className="w-8 h-8 rounded-full bg-neutral-200 mb-1" />
        <div className="w-3/4 h-1 bg-indigo-500 rounded-sm" />
        <div className="w-2/3 h-1 bg-neutral-300 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        {
          id: uid(), type: 'text', x: 140, y: 220, width: 1000, height: 200, content: '"Design is not just what it looks like and feels like. Design is how it works."', zIndex: z, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 64, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.2 },
        },
        {
          id: uid(), type: 'text', x: 140, y: 480, width: 1000, height: 50, content: '— Steve Jobs', zIndex: z+1, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 28, fontWeight: 'normal', color: palette[2] || palette[3] || palette[1], textAlign: 'center' },
        }
      ];
    }
  },
  {
    id: 'team-profile',
    name: 'Team Profile',
    thumbnail: (
      <div className="w-full h-full flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
        <div className="w-10 h-10 rounded-full bg-neutral-200" />
        <div className="w-1/2 flex flex-col gap-1">
          <div className="w-full h-1.5 bg-indigo-500 rounded-sm" />
          <div className="w-1/2 h-1 bg-neutral-300 rounded-sm" />
          <div className="w-full h-1 bg-neutral-300 mt-1 rounded-sm" />
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        { id: uid(), type: 'image', x: 140, y: 160, width: 400, height: 400, objectFit: 'cover', zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'text', x: 600, y: 220, width: 540, height: 60, content: 'Jane Doe', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 64, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.1 } },
        { id: uid(), type: 'text', x: 600, y: 290, width: 540, height: 40, content: 'Chief Creative Officer', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 24, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'left' } },
        { id: uid(), type: 'text', x: 600, y: 350, width: 540, height: 160, content: 'With over 15 years of experience in product design and brand strategy, Jane leads our creative direction, ensuring that every touchpoint resonates with our audience.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 22, color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.5 } }
      ];
    }
  },
  {
    id: 'timeline',
    name: 'Process Steps',
    thumbnail: (
      <div className="w-full h-full flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100">
        <div className="w-1/4 h-8 border border-neutral-300 rounded-sm flex flex-col justify-center items-center gap-0.5"><div className="w-1/2 h-0.5 bg-indigo-500" /></div>
        <div className="w-1/4 h-8 border border-neutral-300 rounded-sm flex flex-col justify-center items-center gap-0.5"><div className="w-1/2 h-0.5 bg-indigo-500" /></div>
        <div className="w-1/4 h-8 border border-neutral-300 rounded-sm flex flex-col justify-center items-center gap-0.5"><div className="w-1/2 h-0.5 bg-indigo-500" /></div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        { id: uid(), type: 'text', x: 80, y: 80, width: CANVAS_W - 160, height: 80, content: 'Our Process', zIndex: z, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 52, fontWeight: 'bold', color: palette[1], textAlign: 'center', lineHeight: 1.2 } },
        { id: uid(), type: 'shape', shapeType: 'rect', x: 120, y: 320, width: CANVAS_W - 240, height: 4, zIndex: z, visible: true, locked: false, shapeStyle: { fill: 'rgba(255,255,255,0.1)' } },
        
        { id: uid(), type: 'shape', shapeType: 'circle', x: 180, y: 290, width: 64, height: 64, zIndex: z+1, visible: true, locked: false, shapeStyle: { fill: palette[2] || '#38BDF8' } },
        { id: uid(), type: 'text', x: 180, y: 290, width: 64, height: 64, content: '1', zIndex: z+2, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', lineHeight: 2 } },
        { id: uid(), type: 'text', x: 80, y: 380, width: 264, height: 50, content: 'Discovery', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 24, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 80, y: 430, width: 264, height: 100, content: 'Research and gather requirements.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 18, color: palette[3] || palette[1], textAlign: 'center' } },

        { id: uid(), type: 'shape', shapeType: 'circle', x: 580, y: 290, width: 64, height: 64, zIndex: z+1, visible: true, locked: false, shapeStyle: { fill: palette[2] || '#38BDF8' } },
        { id: uid(), type: 'text', x: 580, y: 290, width: 64, height: 64, content: '2', zIndex: z+2, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', lineHeight: 2 } },
        { id: uid(), type: 'text', x: 480, y: 380, width: 264, height: 50, content: 'Design', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 24, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 480, y: 430, width: 264, height: 100, content: 'Create visual concepts and layouts.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 18, color: palette[3] || palette[1], textAlign: 'center' } },

        { id: uid(), type: 'shape', shapeType: 'circle', x: 980, y: 290, width: 64, height: 64, zIndex: z+1, visible: true, locked: false, shapeStyle: { fill: palette[2] || '#38BDF8' } },
        { id: uid(), type: 'text', x: 980, y: 290, width: 64, height: 64, content: '3', zIndex: z+2, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', lineHeight: 2 } },
        { id: uid(), type: 'text', x: 880, y: 380, width: 264, height: 50, content: 'Development', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 24, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 880, y: 430, width: 264, height: 100, content: 'Build and launch the product.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 18, color: palette[3] || palette[1], textAlign: 'center' } },
      ];
    }
  },
  {
    id: 'big-stat',
    name: 'Big Statistic',
    thumbnail: (
      <div className="w-full h-full flex flex-col justify-center items-center opacity-80 group-hover:opacity-100 gap-1">
        <div className="w-1/2 h-4 bg-indigo-500 rounded-sm" />
        <div className="w-3/4 h-1 bg-neutral-300 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      return [
        { id: uid(), type: 'text', x: 140, y: 200, width: 1000, height: 160, content: '99.9%', zIndex: z, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 160, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'center', lineHeight: 1 } },
        { id: uid(), type: 'text', x: 140, y: 400, width: 1000, height: 80, content: 'Customer Satisfaction Rate', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: headingFont, fontSize: 42, fontWeight: 'bold', color: palette[1], textAlign: 'center' } },
        { id: uid(), type: 'text', x: 340, y: 480, width: 600, height: 100, content: 'Based on surveys from over 10,000 active users worldwide this year.', zIndex: z+1, visible: true, locked: false, textStyle: { fontFamily: bodyFont, fontSize: 24, color: palette[3] || palette[1], textAlign: 'center' } }
      ];
    }
  },
  {
    id: 'keynote-diagonal',
    name: 'Diagonal Reveal',
    thumbnail: (
      <div className="relative w-full h-full overflow-hidden rounded-sm opacity-80 group-hover:opacity-100">
        <div className="absolute inset-0 bg-neutral-200" style={{ clipPath: 'polygon(38% 0, 100% 0, 100% 100%, 0 100%, 0 0)' }} />
        <div className="absolute left-0 top-0 w-[38%] h-full bg-neutral-800" />
        <div className="absolute left-[34%] top-0 w-[6%] h-[140%] -rotate-12 bg-indigo-500/80 origin-top" />
        <div className="absolute left-1.5 top-2 w-[30%] space-y-0.5">
          <div className="w-full h-0.5 bg-white/40 rounded-sm" />
          <div className="w-4/5 h-1 bg-white rounded-sm" />
          <div className="w-3/5 h-0.5 bg-white/50 rounded-sm" />
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const panelW = Math.round(CANVAS_W / 1.618); // φ minor ≈ 791
      const imgX = panelW - 48;
      const imgW = CANVAS_W - imgX - 48;
      const imgH = Math.round((CANVAS_H - 112) * 0.618) + 112;
      const imgY = Math.round((CANVAS_H - imgH) / 2);
      return [
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: panelW, height: CANVAS_H, zIndex: z, visible: true, locked: false,
          shapeStyle: { fill: palette[0] || '#05050A', stroke: 'transparent', cornerRadius: 0 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: panelW - 24, y: -40, width: 12, height: CANVAS_H + 80, rotation: -14, zIndex: z + 1, visible: true, locked: false,
          shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 0 },
        },
        {
          id: uid(), type: 'image', x: imgX, y: imgY, width: imgW, height: imgH, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER,
        },
        {
          id: uid(), type: 'text', x: 56, y: 168, width: panelW - 112, height: 28, content: 'CHAPTER 03', zIndex: z + 2, visible: true, locked: false, opacity: 0.55,
          textStyle: { fontFamily: bodyFont, fontSize: 14, fontWeight: '600', color: palette[3] || '#94A3B8', textAlign: 'left', lineHeight: 1, letterSpacing: 4 },
        },
        {
          id: uid(), type: 'text', x: 56, y: 212, width: panelW - 112, height: 200, content: 'Design that moves markets', zIndex: z + 2, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 56, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.08, letterSpacing: -0.5 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 56, y: 432, width: 72, height: 3, zIndex: z + 2, visible: true, locked: false,
          shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 },
        },
        {
          id: uid(), type: 'text', x: 56, y: 456, width: panelW - 112, height: 120, content: 'A cinematic split that pairs editorial typography with a hero visual — built for keynote moments.', zIndex: z + 2, visible: true, locked: false, opacity: 0.85,
          textStyle: { fontFamily: bodyFont, fontSize: 18, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.55, letterSpacing: 0.2 },
        },
      ];
    },
  },
  {
    id: 'mosaic-stack',
    name: 'Layered Mosaic',
    thumbnail: (
      <div className="relative w-full h-full overflow-hidden rounded-sm opacity-80 group-hover:opacity-100">
        <div className="absolute left-0.5 top-0.5 w-[52%] h-[55%] bg-neutral-200 rounded-sm" />
        <div className="absolute left-[38%] top-[28%] w-[38%] h-[42%] bg-neutral-300 rounded-sm shadow-sm ring-1 ring-white/80" />
        <div className="absolute right-0.5 top-0.5 w-[28%] h-[32%] bg-neutral-200 rounded-sm shadow-sm ring-1 ring-white/80" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-neutral-900/90 to-neutral-900/40" />
        <div className="absolute left-1.5 bottom-2 w-[70%] h-1 bg-white rounded-sm" />
        <div className="absolute left-1.5 bottom-0.5 w-1/2 h-0.5 bg-white/50 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const pad = 64;
      const heroW = Math.round(CANVAS_W * 0.618) - pad;
      const heroH = Math.round(heroW / 1.618);
      return [
        { id: uid(), type: 'image', x: pad, y: pad, width: heroW, height: heroH, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'image', x: Math.round(CANVAS_W * 0.382), y: Math.round(CANVAS_H * 0.28), width: 400, height: 280, zIndex: z + 1, visible: true, locked: false, src: IMG_PLACEHOLDER },
        { id: uid(), type: 'image', x: CANVAS_W - pad - 360, y: pad + 24, width: 360, height: 240, zIndex: z + 2, visible: true, locked: false, src: IMG_PLACEHOLDER },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 0, y: 512, width: CANVAS_W, height: 208, zIndex: z + 3, visible: true, locked: false, opacity: 0.92,
          shapeStyle: { fill: palette[0] || '#05050A', stroke: 'transparent', cornerRadius: 0 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 536, width: CANVAS_W - pad * 2, height: 56, content: 'Crafted for the spotlight', zIndex: z + 4, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 44, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.1, letterSpacing: -0.5 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 600, width: 720, height: 48, content: 'Overlapping visuals with a grounded caption band — agency portfolio energy.', zIndex: z + 4, visible: true, locked: false, opacity: 0.7,
          textStyle: { fontFamily: bodyFont, fontSize: 18, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.45, letterSpacing: 0.3 },
        },
      ];
    },
  },
  {
    id: 'kpi-spotlight',
    name: 'KPI Spotlight',
    thumbnail: (
      <div className="relative w-full h-full bg-neutral-900 rounded-sm overflow-hidden opacity-80 group-hover:opacity-100">
        <div className="absolute left-1 top-1.5 w-6 h-0.5 bg-neutral-500 rounded-sm" />
        <div className="absolute left-1 top-3 w-[55%] h-3 bg-indigo-500 rounded-sm" />
        <div className="absolute left-1 bottom-2 w-[38%] h-0.5 bg-white/30 rounded-sm" />
        <div className="absolute right-1 top-2 bottom-2 w-[32%] flex flex-col justify-between gap-0.5">
          <div className="h-[30%] rounded-sm border border-white/10 bg-white/5 p-0.5"><div className="w-2/3 h-1 bg-indigo-400/80 rounded-sm" /></div>
          <div className="h-[30%] rounded-sm border border-white/10 bg-white/5 p-0.5"><div className="w-2/3 h-1 bg-indigo-400/60 rounded-sm" /></div>
          <div className="h-[30%] rounded-sm border border-white/10 bg-white/5 p-0.5"><div className="w-2/3 h-1 bg-indigo-400/40 rounded-sm" /></div>
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const pad = 80;
      const mainW = Math.round(CANVAS_W / 1.618) - pad;
      const sideX = pad + mainW + 48;
      const sideW = CANVAS_W - sideX - pad;
      const cardH = Math.round((CANVAS_H - pad * 2 - 48) / 3);
      return [
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: z, visible: true, locked: false,
          shapeStyle: { fill: palette[0] || '#05050A', stroke: 'transparent', cornerRadius: 0 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 108, width: mainW, height: 24, content: 'ANNUAL GROWTH', zIndex: z + 1, visible: true, locked: false, opacity: 0.5,
          textStyle: { fontFamily: bodyFont, fontSize: 13, fontWeight: '600', color: palette[3] || '#94A3B8', textAlign: 'left', lineHeight: 1, letterSpacing: 5 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 148, width: mainW, height: 140, content: '247%', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 120, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'left', lineHeight: 0.95, letterSpacing: -2 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: pad, y: 300, width: 96, height: 4, zIndex: z + 1, visible: true, locked: false,
          shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 324, width: mainW, height: 48, content: 'Year-over-year revenue acceleration', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 28, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 384, width: mainW, height: 100, content: 'Investor-grade metric slide with dominant numerals and refined secondary copy.', zIndex: z + 1, visible: true, locked: false, opacity: 0.72,
          textStyle: { fontFamily: bodyFont, fontSize: 18, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.55, letterSpacing: 0.15 },
        },
        ...[0, 1, 2].flatMap((i) => {
          const cy = pad + i * (cardH + 24);
          const labels = ['Net retention', 'Gross margin', 'Runway'];
          const values = ['142%', '68%', '24 mo'];
          const subs = ['Best-in-class cohort', 'Unit economics', 'At current burn'];
          return [
            {
              id: uid(), type: 'shape', shapeType: 'rect', x: sideX, y: cy, width: sideW, height: cardH, zIndex: z + 1, visible: true, locked: false,
              shapeStyle: { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, cornerRadius: 16 },
            },
            {
              id: uid(), type: 'text', x: sideX + 24, y: cy + 20, width: sideW - 48, height: 20, content: labels[i], zIndex: z + 2, visible: true, locked: false, opacity: 0.55,
              textStyle: { fontFamily: bodyFont, fontSize: 12, fontWeight: '600', color: palette[3] || '#94A3B8', textAlign: 'left', letterSpacing: 2 },
            },
            {
              id: uid(), type: 'text', x: sideX + 24, y: cy + 44, width: sideW - 48, height: 40, content: values[i], zIndex: z + 2, visible: true, locked: false,
              textStyle: { fontFamily: headingFont, fontSize: 36, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1 },
            },
            {
              id: uid(), type: 'text', x: sideX + 24, y: cy + cardH - 36, width: sideW - 48, height: 24, content: subs[i], zIndex: z + 2, visible: true, locked: false, opacity: 0.65,
              textStyle: { fontFamily: bodyFont, fontSize: 14, color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.3 },
            },
          ];
        }),
      ];
    },
  },
  {
    id: 'luxury-bento',
    name: 'Luxury Bento',
    thumbnail: (
      <div className="w-full h-full flex flex-col gap-0.5 p-0.5 opacity-80 group-hover:opacity-100">
        <div className="w-2/5 h-1 bg-indigo-500 rounded-sm" />
        <div className="flex-1 flex gap-0.5 min-h-0">
          <div className="flex-[1.618] bg-neutral-200 rounded-sm" />
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex-[1.2] rounded-sm border border-neutral-200 bg-white p-0.5">
              <div className="w-3/4 h-1 bg-neutral-800 rounded-sm" />
              <div className="w-1/2 h-0.5 bg-neutral-300 mt-0.5 rounded-sm" />
            </div>
            <div className="flex-1 bg-neutral-200 rounded-sm" />
            <div className="flex-1 flex gap-0.5">
              <div className="flex-1 bg-neutral-200 rounded-sm" />
              <div className="flex-1 bg-indigo-500/20 rounded-sm border border-indigo-200" />
            </div>
          </div>
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const pad = 56;
      const gutter = 20;
      const topH = 72;
      const gridY = pad + topH + 16;
      const gridH = CANVAS_H - gridY - pad;
      const leftW = Math.round((CANVAS_W - pad * 2 - gutter) / 1.618);
      const rightW = CANVAS_W - pad * 2 - gutter - leftW;
      const rightX = pad + leftW + gutter;
      const rightTopH = Math.round(gridH / 1.618);
      const rightBotH = gridH - rightTopH - gutter;
      const botCellW = Math.round((rightW - gutter) / 2);
      return [
        {
          id: uid(), type: 'text', x: pad, y: pad, width: CANVAS_W - pad * 2, height: topH, content: 'Product ecosystem', zIndex: z + 5, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 48, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.1, letterSpacing: -0.5 },
        },
        { id: uid(), type: 'image', x: pad, y: gridY, width: leftW, height: gridH, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: rightX, y: gridY, width: rightW, height: rightTopH, zIndex: z, visible: true, locked: false,
          shapeStyle: { fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1, cornerRadius: 20 },
        },
        {
          id: uid(), type: 'text', x: rightX + 28, y: gridY + 28, width: rightW - 56, height: 36, content: '01', zIndex: z + 1, visible: true, locked: false, opacity: 0.35,
          textStyle: { fontFamily: headingFont, fontSize: 32, fontWeight: 'bold', color: palette[2] || '#38BDF8', textAlign: 'left', lineHeight: 1 },
        },
        {
          id: uid(), type: 'text', x: rightX + 28, y: gridY + 72, width: rightW - 56, height: 44, content: 'Platform', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 28, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.15 },
        },
        {
          id: uid(), type: 'text', x: rightX + 28, y: gridY + rightTopH - 72, width: rightW - 56, height: 48, content: 'Core infrastructure layer.', zIndex: z + 1, visible: true, locked: false, opacity: 0.7,
          textStyle: { fontFamily: bodyFont, fontSize: 16, color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.45 },
        },
        { id: uid(), type: 'image', x: rightX, y: gridY + rightTopH + gutter, width: botCellW, height: rightBotH, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: rightX + botCellW + gutter, y: gridY + rightTopH + gutter, width: botCellW, height: rightBotH, zIndex: z, visible: true, locked: false,
          shapeStyle: { fill: palette[2] ? `${palette[2]}22` : 'rgba(56,189,248,0.12)', stroke: palette[2] || '#38BDF8', strokeWidth: 1, cornerRadius: 20 },
        },
        {
          id: uid(), type: 'text', x: rightX + botCellW + gutter + 20, y: gridY + rightTopH + gutter + 24, width: botCellW - 40, height: 80, content: 'Launch\n2026', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 26, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.2 },
        },
      ];
    },
  },
  {
    id: 'golden-editorial',
    name: 'Golden Editorial',
    thumbnail: (
      <div className="w-full h-full flex gap-0.5 opacity-80 group-hover:opacity-100">
        <div className="w-[38.2%] h-full flex flex-col justify-center gap-1 p-1">
          <div className="w-3/4 h-0.5 bg-neutral-400 rounded-sm" />
          <div className="w-full h-1.5 bg-indigo-500 rounded-sm" />
          <div className="w-full h-0.5 bg-neutral-300 rounded-sm" />
          <div className="w-5/6 h-0.5 bg-neutral-300 rounded-sm" />
        </div>
        <div className="flex-1 h-full bg-neutral-200 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const textW = Math.round(CANVAS_W / 1.618);
      const imgX = textW;
      const imgW = CANVAS_W - textW;
      const thirdY = Math.round(CANVAS_H / 3);
      return [
        { id: uid(), type: 'image', x: imgX, y: 0, width: imgW, height: CANVAS_H, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        {
          id: uid(), type: 'text', x: 72, y: thirdY - 24, width: textW - 120, height: 24, content: 'EDITORIAL', zIndex: z + 1, visible: true, locked: false, opacity: 0.5,
          textStyle: { fontFamily: bodyFont, fontSize: 12, fontWeight: '600', color: palette[3] || '#94A3B8', textAlign: 'left', letterSpacing: 4 },
        },
        {
          id: uid(), type: 'text', x: 72, y: thirdY, width: textW - 120, height: 180, content: 'Quiet confidence', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 64, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.05, letterSpacing: -1 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 72, y: thirdY + 196, width: 80, height: 2, zIndex: z + 1, visible: true, locked: false,
          shapeStyle: { fill: palette[1], stroke: 'transparent', cornerRadius: 0 },
        },
        {
          id: uid(), type: 'text', x: 72, y: thirdY + 220, width: textW - 120, height: 140, content: 'Golden-ratio proportions frame the narrative. Pair a restrained headline with generous breathing room and a full-bleed visual.', zIndex: z + 1, visible: true, locked: false, opacity: 0.8,
          textStyle: { fontFamily: bodyFont, fontSize: 18, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.6, letterSpacing: 0.2 },
        },
      ];
    },
  },
  {
    id: 'statement-display',
    name: 'Statement Display',
    thumbnail: (
      <div className="w-full h-full flex gap-0.5 opacity-80 group-hover:opacity-100">
        <div className="w-[62%] h-full flex flex-col justify-center gap-1 p-1">
          <div className="w-full h-2 bg-indigo-500 rounded-sm leading-none" />
          <div className="w-4/5 h-2 bg-indigo-500/70 rounded-sm" />
          <div className="w-1/3 h-0.5 bg-neutral-400 mt-0.5 rounded-sm" />
        </div>
        <div className="flex-1 h-full bg-neutral-200 rounded-sm" />
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const pad = 80;
      const textZoneW = Math.round(CANVAS_W * (2 / 3)) - pad;
      const imgX = Math.round(CANVAS_W * (2 / 3));
      const imgW = CANVAS_W - imgX;
      return [
        { id: uid(), type: 'image', x: imgX, y: 0, width: imgW, height: CANVAS_H, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        {
          id: uid(), type: 'text', x: pad, y: 200, width: textZoneW, height: 280, content: 'The future belongs to those who build it.', zIndex: z + 1, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 72, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.05, letterSpacing: -1.5 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 500, width: textZoneW, height: 80, content: '— Vision statement', zIndex: z + 1, visible: true, locked: false, opacity: 0.55,
          textStyle: { fontFamily: bodyFont, fontSize: 18, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4, letterSpacing: 1.2 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: pad, y: 592, width: textZoneW * 0.382, height: 1, zIndex: z + 1, visible: true, locked: false, opacity: 0.25,
          shapeStyle: { fill: palette[3] || palette[1], stroke: 'transparent', cornerRadius: 0 },
        },
      ];
    },
  },
  {
    id: 'metric-trio',
    name: 'Metric Trio',
    thumbnail: (
      <div className="w-full h-full flex flex-col gap-0.5 p-0.5 opacity-80 group-hover:opacity-100">
        <div className="w-1/2 h-1 bg-indigo-500 rounded-sm" />
        <div className="flex-1 flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 rounded-sm border border-neutral-200 bg-white flex flex-col justify-end p-0.5 gap-0.5">
              <div className={`w-2/3 h-1.5 rounded-sm ${i === 1 ? 'bg-indigo-500' : 'bg-neutral-800'}`} />
              <div className="w-full h-0.5 bg-neutral-300 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const pad = 80;
      const gutter = 48;
      const cardW = Math.round((CANVAS_W - pad * 2 - gutter * 2) / 3);
      const cardH = 400;
      const cardY = 240;
      const metrics = [
        { value: '$12M', label: 'ARR', desc: 'Annual recurring revenue at scale.' },
        { value: '3.2×', label: 'LTV / CAC', desc: 'Efficient growth economics.' },
        { value: '98%', label: 'NPS', desc: 'Customer love score.' },
      ];
      return [
        {
          id: uid(), type: 'text', x: pad, y: 72, width: CANVAS_W - pad * 2, height: 64, content: 'Traction at a glance', zIndex: z + 2, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 44, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.1, letterSpacing: -0.5 },
        },
        {
          id: uid(), type: 'text', x: pad, y: 144, width: 560, height: 40, content: 'Three pillars of momentum — spaced on a precise grid.', zIndex: z + 2, visible: true, locked: false, opacity: 0.65,
          textStyle: { fontFamily: bodyFont, fontSize: 18, color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.4 },
        },
        ...metrics.flatMap((m, i) => {
          const cx = pad + i * (cardW + gutter);
          return [
            {
              id: uid(), type: 'shape', shapeType: 'rect', x: cx, y: cardY, width: cardW, height: cardH, zIndex: z, visible: true, locked: false,
              shapeStyle: { fill: 'rgba(255,255,255,0.04)', stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, cornerRadius: 24 },
            },
            {
              id: uid(), type: 'text', x: cx + 32, y: cardY + 36, width: cardW - 64, height: 28, content: m.label, zIndex: z + 1, visible: true, locked: false, opacity: 0.55,
              textStyle: { fontFamily: bodyFont, fontSize: 13, fontWeight: '600', color: palette[3] || '#94A3B8', textAlign: 'left', letterSpacing: 3 },
            },
            {
              id: uid(), type: 'text', x: cx + 32, y: cardY + 80, width: cardW - 64, height: 100, content: m.value, zIndex: z + 1, visible: true, locked: false,
              textStyle: { fontFamily: headingFont, fontSize: i === 1 ? 64 : 56, fontWeight: 'bold', color: i === 1 ? (palette[2] || '#38BDF8') : palette[1], textAlign: 'left', lineHeight: 1, letterSpacing: -1 },
            },
            {
              id: uid(), type: 'shape', shapeType: 'rect', x: cx + 32, y: cardY + 200, width: 48, height: 3, zIndex: z + 1, visible: true, locked: false,
              shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 2 },
            },
            {
              id: uid(), type: 'text', x: cx + 32, y: cardY + 224, width: cardW - 64, height: 120, content: m.desc, zIndex: z + 1, visible: true, locked: false, opacity: 0.75,
              textStyle: { fontFamily: bodyFont, fontSize: 17, color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.5 },
            },
          ];
        }),
      ];
    },
  },
  {
    id: 'vision-cinema',
    name: 'Vision Cinema',
    thumbnail: (
      <div className="relative w-full h-full overflow-hidden rounded-sm opacity-80 group-hover:opacity-100">
        <div className="absolute inset-0 bg-neutral-300" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-900/80 via-neutral-900/40 to-transparent" />
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[55%] space-y-0.5">
          <div className="w-1/3 h-0.5 bg-white/40 rounded-sm" />
          <div className="w-full h-1.5 bg-white rounded-sm" />
          <div className="w-4/5 h-0.5 bg-white/60 rounded-sm" />
        </div>
      </div>
    ),
    generate: (uid: () => string, palette: string[], headingFont: string, bodyFont: string) => {
      const z = 100;
      const overlayW = Math.round(CANVAS_W * 0.618);
      return [
        { id: uid(), type: 'image', x: 0, y: 0, width: CANVAS_W, height: CANVAS_H, zIndex: z, visible: true, locked: false, src: IMG_PLACEHOLDER },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 0, y: 0, width: overlayW, height: CANVAS_H, zIndex: z + 1, visible: true, locked: false, opacity: 0.78,
          shapeStyle: { fill: palette[0] || '#05050A', stroke: 'transparent', cornerRadius: 0 },
        },
        {
          id: uid(), type: 'text', x: 80, y: 240, width: overlayW - 120, height: 24, content: 'SERIES A', zIndex: z + 2, visible: true, locked: false, opacity: 0.5,
          textStyle: { fontFamily: bodyFont, fontSize: 13, fontWeight: '600', color: palette[3] || '#94A3B8', textAlign: 'left', letterSpacing: 5 },
        },
        {
          id: uid(), type: 'text', x: 80, y: 280, width: overlayW - 120, height: 200, content: 'Redefining\nthe category', zIndex: z + 2, visible: true, locked: false,
          textStyle: { fontFamily: headingFont, fontSize: 68, fontWeight: 'bold', color: palette[1], textAlign: 'left', lineHeight: 1.02, letterSpacing: -1.5 },
        },
        {
          id: uid(), type: 'text', x: 80, y: 500, width: 480, height: 72, content: 'Full-bleed imagery with a cinematic gradient veil — made for opening slides.', zIndex: z + 2, visible: true, locked: false, opacity: 0.72,
          textStyle: { fontFamily: bodyFont, fontSize: 18, fontWeight: 'normal', color: palette[3] || palette[1], textAlign: 'left', lineHeight: 1.55 },
        },
        {
          id: uid(), type: 'shape', shapeType: 'rect', x: 80, y: 596, width: 120, height: 40, zIndex: z + 2, visible: true, locked: false,
          shapeStyle: { fill: palette[2] || '#38BDF8', stroke: 'transparent', cornerRadius: 8 },
        },
        {
          id: uid(), type: 'text', x: 80, y: 596, width: 120, height: 40, content: 'Explore', zIndex: z + 3, visible: true, locked: false,
          textStyle: { fontFamily: bodyFont, fontSize: 15, fontWeight: '600', color: '#FFFFFF', textAlign: 'center', lineHeight: 2.4, letterSpacing: 0.5 },
        },
      ];
    },
  },
];

export function LayoutsPanel() {
  const { presentation, currentSlideIndex, updateSlide, selectElement } = usePresentationStore();

  const handleInsert = (layout: typeof LAYOUTS[0]) => {
    if (!presentation) return;
    const slide = presentation.slides[currentSlideIndex];
    if (!slide) return;

    const palette = presentation.colorPalette || ['#05050A', '#FFFFFF', '#38BDF8', '#94A3B8'];
    const headingFont = presentation.fontPairing?.heading || 'Space Grotesk';
    const bodyFont = presentation.fontPairing?.body || 'Inter';
    const uid = () => `el-layout-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    const newElements = layout.generate(uid, palette, headingFont, bodyFont) as import('@/types').SlideElement[];
    
    // Keep the background image if it exists
    const bgElement = (slide.elements || []).find(e => e.type === 'image' && e.width === CANVAS_W && e.height === CANVAS_H);
    
    updateSlide(slide.id, {
      elements: bgElement ? [bgElement, ...newElements] : newElements
    }, true);
    
    selectElement(null);
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA]">
      <div className="flex-none pt-4 px-4 pb-3 border-b border-neutral-100 bg-white sticky top-0 z-20">
        <h2 className="text-[14px] font-bold text-neutral-900 leading-tight flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
            <Layout className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            Smart Layouts
            <p className="text-[11px] font-medium text-neutral-400 mt-0.5 leading-none">Professional slide structures</p>
          </div>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            onClick={() => handleInsert(layout)}
            className="w-full flex items-center gap-3.5 p-3 rounded-[14px] bg-white border border-neutral-200 hover:border-indigo-300 hover:shadow-md transition-all text-left group"
          >
            <div className="w-14 h-10 rounded-md border border-neutral-200 bg-neutral-50 shrink-0 p-1.5 shadow-sm">
              {layout.thumbnail}
            </div>
            <div>
              <div className="text-[13px] font-bold text-neutral-800 group-hover:text-indigo-700 transition-colors">
                {layout.name}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
