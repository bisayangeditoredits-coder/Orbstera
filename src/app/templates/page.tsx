"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { 
  Sparkles, 
  Search, 
  ArrowRight, 
  Lock,
  Terminal,
  Loader2
} from 'lucide-react';

const CATEGORIES = ["All", "Frameworks", "Aesthetics", "AI Powers"];

// Fallback templates in case DB isn't connected yet
const FALLBACK_TEMPLATES = [
  {
    id: "seq-pitch",
    title: "Series A Pitch Deck",
    description: "The classic 12-slide structure. Optimized for VCs, highlighting traction, market size, and the ask.",
    category: "Frameworks",
    theme_id: "modern-dark",
    base_prompt: "Create a 12-slide Series A pitch deck using the Sequoia structure. Focus on market size, traction, and our ask.",
    color_gradient: "from-blue-500 to-indigo-600",
    text_color: "text-white",
    icon_name: "Briefcase",
    is_premium: false,
  },
  {
    id: "obsidian-cyber",
    title: "Obsidian Cyber",
    description: "Deep dark mode with glassmorphism and neon accents. Perfect for AI, Web3, and DevTools.",
    category: "Aesthetics",
    theme_id: "tech",
    base_prompt: "Create a presentation with a Cyber-dark theme, neon accents, and deep black backgrounds.",
    color_gradient: "from-zinc-900 to-black",
    text_color: "text-white",
    icon_name: "Palette",
    is_premium: true,
  }
];

export default function TemplatesPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setTemplates(data);
          } else {
            setTemplates(FALLBACK_TEMPLATES);
          }
        } else {
          setTemplates(FALLBACK_TEMPLATES);
        }
      } catch (err) {
        console.error("Failed to fetch templates:", err);
        setTemplates(FALLBACK_TEMPLATES);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const filteredTemplates = templates.filter(t => {
    const matchesCategory = activeCategory === "All" || t.category === activeCategory;
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleUseTemplate = (template: any) => {
    router.push(`/templates/${template.slug}`);
  };

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-32 pb-24 selection:bg-primary/20 selection:text-primary">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-black/[0.05] shadow-sm mb-6"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-neutral-600">The Prompt Library</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-semibold text-neutral-900 tracking-tighter mb-6"
          >
            What do you want to <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">build today?</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-neutral-500 font-medium max-w-2xl text-balance tracking-tight mb-10"
          >
            Choose a proven framework, select a premium aesthetic, or let our AI extract insights from your data.
          </motion.p>

          {/* AI Command Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-2xl relative group"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center bg-white rounded-2xl border border-black/[0.06] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-2">
              <div className="w-12 h-12 flex items-center justify-center text-neutral-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="e.g. A marketing report for Q3..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 text-neutral-900 placeholder:text-neutral-400 font-medium text-lg px-2 outline-none"
              />
              <button className="h-10 px-6 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
                Search <span className="hidden sm:inline">Library</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* Categories */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
        >
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                activeCategory === category 
                  ? 'bg-neutral-900 text-white shadow-md' 
                  : 'bg-white border border-black/[0.05] text-neutral-600 hover:border-black/[0.15] hover:text-neutral-900'
              }`}
            >
              {category}
            </button>
          ))}
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
            <p className="text-neutral-500 font-medium">Loading templates...</p>
          </div>
        )}

        {/* Templates Grid */}
        {!isLoading && (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template, index) => {
                // Dynamically resolve icon from lucide-react or fallback to Layout
                const IconComponent = (Icons as any)[template.icon_name] || Icons.Layout;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    key={template.id}
                    className="group relative bg-white rounded-[2rem] border border-black/[0.04] p-2 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_-10px_rgba(71,59,240,0.15)] transition-all duration-500 overflow-hidden"
                  >
                    {/* Top Preview Area */}
                    <div className={`relative h-48 rounded-[1.5rem] bg-gradient-to-br ${template.color_gradient || 'from-gray-100 to-gray-200'} flex flex-col items-center justify-center p-6 overflow-hidden`}>
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:16px_16px]" />
                      
                      <motion.div 
                        whileHover={{ scale: 1.05 }}
                        className="relative w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center shadow-xl mb-4 group-hover:-translate-y-1 transition-transform duration-300"
                      >
                        <IconComponent className={`w-8 h-8 ${template.text_color || 'text-white'}`} strokeWidth={1.5} />
                      </motion.div>
                      
                      <div className={`text-center relative z-10 ${template.text_color || 'text-white'}`}>
                        <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">{template.category}</span>
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                        <button 
                          onClick={() => handleUseTemplate(template)}
                          className="translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-neutral-900 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 active:scale-95"
                        >
                          Use Prompt <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Content Area */}
                    <div className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <h3 className="text-xl font-bold text-neutral-900 tracking-tight leading-tight group-hover:text-primary transition-colors">
                          {template.title}
                        </h3>
                        {template.is_premium && (
                          <div className="shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 border border-amber-200">
                            <Lock size={12} strokeWidth={2.5} />
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500 font-medium leading-relaxed mb-6">
                        {template.description}
                      </p>

                      {/* Pre-written Prompt Preview */}
                      <div className="bg-neutral-50 rounded-xl p-4 border border-black/[0.03]">
                        <div className="flex items-center gap-2 mb-2">
                          <Terminal size={12} className="text-neutral-400" />
                          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Base Prompt</span>
                        </div>
                        <p className="text-xs font-mono text-neutral-600 line-clamp-2">
                          {template.base_prompt}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {!isLoading && filteredTemplates.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-neutral-400">
              <Search size={24} />
            </div>
            <h3 className="text-xl font-bold text-neutral-900 mb-2">No templates found</h3>
            <p className="text-neutral-500">Try searching for something else or just start typing in the editor.</p>
          </div>
        )}
      </div>
    </main>
  );
}
