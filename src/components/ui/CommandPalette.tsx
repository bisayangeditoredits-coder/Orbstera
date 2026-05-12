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
            className="relative z-10 w-full max-w-2xl rounded-2xl bg-[#0C0C0E]/90 backdrop-blur-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden mx-4"
          >
            <div className="flex items-center px-5 py-5 border-b border-white/5">
              <Search className="w-5 h-5 text-white/30 mr-4" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search commands, tools, and actions..."
                className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/20 font-medium text-lg"
              />
              <div className="flex items-center gap-1 shrink-0">
                <div className="text-[10px] font-black text-white/40 bg-white/5 border border-white/10 px-2 py-1 rounded-md uppercase tracking-tighter">
                  ESC
                </div>
              </div>
            </div>
            
            <div className="max-h-[65vh] overflow-y-auto p-3 custom-scrollbar">
              <div className="px-3 py-2">
                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mb-3">Suggestions</p>
                 
                 {filteredActions.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-white/30 text-sm font-medium">No commands matching "{search}"</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {filteredActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={action.onSelect}
                        className="flex items-center justify-between w-full px-4 py-3.5 text-left rounded-xl hover:bg-white/5 transition-all text-white/70 hover:text-white group"
                      >
                        <div className="flex items-center">
                          <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center mr-4 group-hover:bg-primary/20 transition-colors">
                            <action.icon className="w-4 h-4 text-white/40 group-hover:text-primary transition-colors" />
                          </div>
                          <div>
                            <p className="font-bold text-[14px] leading-tight">{action.label}</p>
                            <p className="text-[11px] text-white/20 font-medium mt-0.5 group-hover:text-white/40">Quick action</p>
                          </div>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="px-2 py-1 rounded-md bg-white/10 text-[9px] font-black text-white/60 uppercase tracking-widest">Execute</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="px-5 py-3.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/30 font-bold">Select</span>
                  <div className="px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-[9px] text-white/40 font-black">↵</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-white/30 font-bold">Navigate</span>
                  <div className="flex items-center gap-1">
                    <div className="px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-[9px] text-white/40 font-black">↑</div>
                    <div className="px-1.5 py-0.5 rounded-sm bg-white/5 border border-white/10 text-[9px] text-white/40 font-black">↓</div>
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-bold text-white/10 uppercase tracking-widest">
                Orbstera OS v1.0
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
