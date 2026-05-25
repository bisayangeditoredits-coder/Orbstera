'use client';

import { usePresentationStore } from '@/store/usePresentationStore';
import { Smartphone, Laptop, Tablet, X, LayoutGrid } from '@/components/icons/lucide';
import { PanelHeaderIcon, PanelCloseIcon, panelCloseButtonClass } from '@/components/icons/panel-chrome';

const MOCKUPS = [
  {
    id: 'iphone-black',
    label: 'iPhone (Dark)',
    icon: Smartphone,
    width: 300,
    height: 600,
    svg: encodeURIComponent(`
      <svg width="300" height="600" viewBox="0 0 300 600" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="280" height="580" rx="40" fill="#1c1c1e" stroke="#3a3a3c" stroke-width="6"/>
        <!-- Notch -->
        <path d="M100 16H200V30C200 40 190 46 180 46H120C110 46 100 40 100 30V16Z" fill="#000000"/>
        <!-- Inner Screen Area -->
        <rect x="18" y="18" width="264" height="564" rx="32" fill="transparent" stroke="#000000" stroke-width="4"/>
        <text x="150" y="300" font-family="sans-serif" font-size="14" fill="#666" text-anchor="middle">Put your image behind</text>
      </svg>
    `)
  },
  {
    id: 'macbook-silver',
    label: 'MacBook Pro',
    icon: Laptop,
    width: 800,
    height: 480,
    svg: encodeURIComponent(`
      <svg width="800" height="480" viewBox="0 0 800 480" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Screen Bezel -->
        <rect x="40" y="20" width="720" height="420" rx="16" fill="#111" stroke="#ccc" stroke-width="2"/>
        <!-- Inner Screen -->
        <rect x="56" y="36" width="688" height="388" fill="transparent"/>
        <text x="400" y="230" font-family="sans-serif" font-size="24" fill="#666" text-anchor="middle">Put your image behind</text>
        <!-- Keyboard Base -->
        <path d="M10 440 L790 440 C795 440 800 445 800 450 L800 460 C800 470 790 480 780 480 L20 480 C10 480 0 470 0 460 L0 450 C0 445 5 440 10 440 Z" fill="#e5e5e5"/>
        <path d="M350 440 L450 440 L440 450 L360 450 Z" fill="#ccc"/>
      </svg>
    `)
  },
  {
    id: 'ipad-silver',
    label: 'iPad',
    icon: Tablet,
    width: 500,
    height: 650,
    svg: encodeURIComponent(`
      <svg width="500" height="650" viewBox="0 0 500 650" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="480" height="630" rx="30" fill="#111" stroke="#e5e5e5" stroke-width="8"/>
        <!-- Inner Screen -->
        <rect x="30" y="30" width="440" height="590" rx="8" fill="transparent"/>
        <text x="250" y="325" font-family="sans-serif" font-size="18" fill="#666" text-anchor="middle">Put your image behind</text>
      </svg>
    `)
  }
];

export function MockupsPanel({ onClose }: { onClose?: () => void }) {
  const addElement = usePresentationStore((s) => s.addElement);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const presentation = usePresentationStore((s) => s.presentation);

  const handleAddMockup = (mockup: typeof MOCKUPS[0]) => {
    if (currentSlideIndex === null || !presentation) return;
    const slideId = presentation.slides[currentSlideIndex]?.id;
    if (!slideId) return;

    // Use scale factor to fit within slide (1280x720)
    let w = mockup.width;
    let h = mockup.height;
    if (w > 1000) {
      h = h * (1000 / w);
      w = 1000;
    }
    if (h > 600) {
      w = w * (600 / h);
      h = 600;
    }

    addElement(slideId, {
      id: `el-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'image',
      x: (1280 - w) / 2,
      y: (720 - h) / 2,
      width: w,
      height: h,
      src: `data:image/svg+xml;utf8,${mockup.svg}`,
      zIndex: 200, // Put it on top so users can slide images underneath
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F7F8FA] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex flex-col border-b border-neutral-100 sticky top-0 z-20 bg-white">
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-4">
          <div className="flex items-center gap-3">
            <PanelHeaderIcon icon={LayoutGrid} className="from-indigo-50 to-indigo-50/80 border-indigo-200/60" iconClassName="text-indigo-600" />
            <div>
              <h2 className="text-[14px] font-bold text-neutral-900 leading-tight">Device Mockups</h2>
              <p className="text-[11px] font-medium text-neutral-400 mt-0.5">Vector SVG Frames</p>
            </div>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className={panelCloseButtonClass} aria-label="Close panel">
              <PanelCloseIcon icon={X} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-24">
        <div className="space-y-3">
          {MOCKUPS.map((mockup) => {
            const Icon = mockup.icon;
            return (
              <button
                key={mockup.id}
                onClick={() => handleAddMockup(mockup)}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white border border-neutral-200/80 hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-50 flex items-center justify-center text-neutral-500 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <span className="text-[13px] font-bold text-neutral-700 group-hover:text-neutral-900 transition-colors">
                    {mockup.label}
                  </span>
                </div>
                <div className="px-2 py-1 rounded bg-neutral-100 text-[10px] font-bold text-neutral-500">
                  Insert
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
          <h4 className="text-[12px] font-bold text-blue-900 mb-1">How to use:</h4>
          <p className="text-[11px] text-blue-700 leading-relaxed">
            1. Insert a device mockup.
            <br />
            2. Insert your image (screenshot).
            <br />
            3. Right-click the image and select <strong>Send Backward</strong> so it goes behind the mockup frame!
          </p>
        </div>
      </div>
    </div>
  );
}
