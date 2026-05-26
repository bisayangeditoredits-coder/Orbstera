'use client';

import { useEffect, useMemo } from 'react';
import { usePresentationStore } from '@/store/usePresentationStore';

export function GlobalFontLoader() {
  const presentation = usePresentationStore((s) => s.presentation);

  const activeFonts = useMemo(() => {
    if (!presentation) return [];
    
    const fonts = new Set<string>();
    
    // Add theme fonts
    if (presentation.fontPairing) {
      if (presentation.fontPairing.heading) fonts.add(presentation.fontPairing.heading);
      if (presentation.fontPairing.body) fonts.add(presentation.fontPairing.body);
    }
    
    // Scan all slides for individual element fonts
    (presentation.slides || []).forEach(slide => {
      (slide.elements || []).forEach(el => {
        if (el.type === 'text' && el.textStyle?.fontFamily) {
          fonts.add(el.textStyle.fontFamily);
        }
      });
    });
    
    return Array.from(fonts).filter(Boolean);
  }, [presentation]);

  useEffect(() => {
    if (activeFonts.length === 0) return;
    
    const familyString = activeFonts.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700;800`).join('&');
    const url = `https://fonts.googleapis.com/css2?${familyString}&display=swap`;
    
    let link = document.getElementById('google-fonts-link') as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.id = 'google-fonts-link';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = url;
  }, [activeFonts]);

  return null;
}
