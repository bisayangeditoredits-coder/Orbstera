'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MonitorPlay, Palette, Download, Home, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [isOpen]);

  // Prevent scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const actions = [
    { icon: Plus, label: 'Generate New Presentation', onSelect: () => { router.push('/editor'); setIsOpen(false); } },
    { icon: MonitorPlay, label: 'View My Presentations', onSelect: () => { router.push('/dashboard'); setIsOpen(false); } },
    { icon: Palette, label: 'Change Theme', onSelect: () => { router.push('/editor'); setIsOpen(false); } },
    { icon: Download, label: 'Export to PPTX', onSelect: () => { setIsOpen(false); } },
    { icon: Home, label: 'Go to Homepage', onSelect: () => { router.push('/'); setIsOpen(false); } },
  ];

  const filteredActions = actions.filter((action) =>
    action.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-md"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-xl rounded-2xl bg-white/80 backdrop-blur-3xl shadow-2xl border border-white/40 overflow-hidden mx-4"
          >
            <div className="flex items-center px-4 py-4 border-b border-black/5">
              <Search className="w-5 h-5 text-black/40 mr-3" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent border-none outline-none text-black placeholder-black/40 font-medium text-lg"
              />
              <div className="text-[10px] font-bold text-black/40 bg-black/5 px-2 py-1 rounded-md uppercase tracking-wider shrink-0">
                ESC
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
              {filteredActions.length === 0 ? (
                <div className="p-8 text-center text-black/40 text-sm font-medium">
                  No results found for "{search}"
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={action.onSelect}
                      className="flex items-center w-full px-3 py-3 text-left rounded-xl hover:bg-black/5 hover:text-primary transition-colors text-black/70 font-semibold text-sm group"
                    >
                      <action.icon className="w-4 h-4 mr-3 text-black/30 group-hover:text-primary transition-colors" />
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
