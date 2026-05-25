'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check, Type } from '@/components/icons/lucide';

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 
  'Poppins', 'Playfair Display', 'Merriweather', 'Outfit', 'Space Grotesk',
  'Oswald', 'Raleway', 'Nunito', 'Ubuntu', 'Rubik', 'Work Sans',
  'Lora', 'Fira Sans', 'Quicksand', 'Karla', 'Inconsolata',
  'PT Sans', 'PT Serif', 'Titillium Web', 'Mukta', 'Dosis',
  'Anton', 'Josefin Sans', 'Cabin', 'Hind', 'Arimo', 'Teko',
  'Bebas Neue', 'Dancing Script', 'Pacifico', 'Caveat', 'Satisfy',
  'Permanent Marker', 'Amatic SC', 'Cinzel', 'Cormorant Garamond',
  'EB Garamond', 'Libre Baskerville', 'Crimson Text', 'Zilla Slab',
  'Bitter', 'Arvo', 'Rokkitt', 'Crete Round', 'Balsamiq Sans',
  'Comfortaa', 'Righteous', 'Fredoka One', 'Alfa Slab One',
  'Abril Fatface', 'Patua One', 'Concert One', 'Yanone Kaffeesatz'
].sort();

interface FontPickerProps {
  value: string;
  onChange: (font: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isClient, setIsClient] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setIsClient(true), []);

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 8,
        left: rect.left,
        width: Math.max(rect.width, 256) // minimum 256px wide
      });
    }
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      updatePosition();
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch('');
    }
  }, [open]);

  // Filter fonts
  const filteredFonts = GOOGLE_FONTS.filter(f => f.toLowerCase().includes(search.toLowerCase()));
  
  // Custom font option if no exact match
  const hasExactMatch = GOOGLE_FONTS.some(f => f.toLowerCase() === search.toLowerCase());
  const showCustomOption = search.trim().length > 0 && !hasExactMatch;

  // Fallback to Inter if empty
  const displayValue = value || 'Inter';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-40 h-8 px-2.5 text-[12px] font-medium text-neutral-800 bg-white border border-neutral-200 rounded-md outline-none hover:border-indigo-400 hover:ring-1 hover:ring-indigo-400/20 transition-all shadow-sm"
        style={{ fontFamily: displayValue }}
      >
        <span className="truncate pr-2">{displayValue}</span>
        <ChevronDown size={14} className={`text-neutral-500 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {isClient && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                width: coords.width,
              }}
              className="bg-white border border-neutral-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-[9999] flex flex-col overflow-hidden"
            >
              {/* Search Input */}
              <div className="p-2 border-b border-neutral-100 bg-neutral-50/80 backdrop-blur-sm relative">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search any font..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 bg-white border border-neutral-200 rounded-lg outline-none text-[13px] text-neutral-800 placeholder-neutral-400 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-all shadow-sm"
                />
              </div>

              {/* List */}
              <div className="max-h-[320px] overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-neutral-200 scrollbar-track-transparent py-1.5 px-1.5 flex flex-col gap-0.5">
                
                {showCustomOption && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(search.trim());
                      setOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/50"
                    style={{ fontFamily: search.trim() }}
                  >
                    <Type size={14} className="shrink-0 opacity-70" />
                    <span className="truncate font-medium">Use &quot;{search.trim()}&quot;</span>
                  </button>
                )}

                {filteredFonts.length === 0 && !showCustomOption ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">
                      <Search size={16} className="text-neutral-400" />
                    </div>
                    <span className="text-[12px] font-medium text-neutral-500">No fonts found</span>
                  </div>
                ) : (
                  filteredFonts.map((font) => (
                    <button
                      key={font}
                      type="button"
                      onClick={() => {
                        onChange(font);
                        setOpen(false);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-[13px] text-left transition-all ${value === font ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-neutral-700 hover:bg-neutral-100'}`}
                      style={{ fontFamily: font }}
                    >
                      <span className="truncate leading-none">{font}</span>
                      {value === font && <Check size={14} strokeWidth={2.5} className="shrink-0 text-indigo-600" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
