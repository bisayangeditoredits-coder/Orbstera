"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { ArrowLeft, Loader2, Wand2, Terminal, Sparkles } from 'lucide-react';
import Link from 'next/link';

// Fallback templates in case DB isn't connected yet
const FALLBACK_TEMPLATES = [
  {
    id: "seq-pitch",
    slug: "seq-pitch",
    title: "Series A Pitch Deck",
    description: "The classic 12-slide structure. Optimized for VCs, highlighting traction, market size, and the ask.",
    category: "Frameworks",
    theme_id: "modern-dark",
    base_prompt: "Create a 12-slide Series A pitch deck using the Sequoia structure. Focus on market size, traction, and our ask.",
    color_gradient: "from-blue-500 to-indigo-600",
    text_color: "text-white",
    icon_name: "Briefcase",
    is_premium: false,
    variables: [
      { id: "companyName", label: "Company Name", placeholder: "e.g. Acme Corp" },
      { id: "problem", label: "Problem Solved", placeholder: "e.g. Inefficient data routing" },
      { id: "ask", label: "Funding Ask", placeholder: "e.g. $5M Series A" }
    ]
  },
  {
    id: "obsidian-cyber",
    slug: "obsidian-cyber",
    title: "Obsidian Cyber",
    description: "Deep dark mode with glassmorphism and neon accents. Perfect for AI, Web3, and DevTools.",
    category: "Aesthetics",
    theme_id: "tech",
    base_prompt: "Create a presentation with a Cyber-dark theme, neon accents, and deep black backgrounds.",
    color_gradient: "from-zinc-900 to-black",
    text_color: "text-white",
    icon_name: "Palette",
    is_premium: true,
    variables: []
  }
];

export default function TemplateViewPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/templates/${params.slug}`);
        let data = null;

        if (res.ok) {
          data = await res.json();
        }

        // Use fallback if API failed or returned empty
        if (!data || data.error) {
          data = FALLBACK_TEMPLATES.find(t => t.slug === params.slug) || null;
        }

        if (data) {
          setTemplate(data);
          // Initialize form data
          if (data.variables && Array.isArray(data.variables)) {
            const initialData: Record<string, string> = {};
            data.variables.forEach((v: any) => {
              initialData[v.id] = "";
            });
            setFormData(initialData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch template:", err);
        // On strict network error, try fallback
        const fallback = FALLBACK_TEMPLATES.find(t => t.slug === params.slug);
        if (fallback) {
          setTemplate(fallback);
          if (fallback.variables && Array.isArray(fallback.variables)) {
            const initialData: Record<string, string> = {};
            fallback.variables.forEach((v: any) => {
              initialData[v.id] = "";
            });
            setFormData(initialData);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }
    fetchTemplate();
  }, [params.slug]);

  const handleGenerate = () => {
    if (!template) return;
    setIsGenerating(true);

    // Construct the final prompt
    let finalPrompt = template.base_prompt;
    
    // Append variables to the prompt
    if (template.variables && template.variables.length > 0) {
      const varsAdded = template.variables
        .map((v: any) => {
          const val = formData[v.id] || "Not specified";
          return `${v.label}: ${val}`;
        })
        .join(". ");
      finalPrompt += `\n\nSpecifics: ${varsAdded}.`;
    }

    const encodedPrompt = encodeURIComponent(finalPrompt);
    router.push(`/editor?prompt=${encodedPrompt}&mode=create&theme=${template.theme_id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-neutral-500 font-medium">Loading AI Playbook...</p>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Template Not Found</h2>
        <Link href="/templates" className="text-primary hover:underline font-medium">
          Return to Library
        </Link>
      </div>
    );
  }

  const IconComponent = (Icons as any)[template.icon_name] || Icons.Layout;

  return (
    <main className="min-h-screen bg-[#FAFAFA] pt-10 sm:pt-14 pb-24 selection:bg-primary/20 selection:text-primary">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        <Link 
          href="/templates" 
          className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900 mb-10 transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Templates
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          
          {/* Left Column: Template Details */}
          <div className="md:col-span-2 flex flex-col">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${template.color_gradient || 'from-gray-200 to-gray-300'} flex items-center justify-center shadow-lg mb-8 border border-black/5`}
            >
              <IconComponent className={`w-10 h-10 ${template.text_color || 'text-white'}`} strokeWidth={1.5} />
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl font-semibold text-neutral-900 tracking-tighter leading-tight mb-4"
            >
              {template.title}
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-neutral-500 font-medium leading-relaxed mb-8"
            >
              {template.description}
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 border border-black/[0.04] shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <Terminal size={14} className="text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">System Blueprint</span>
              </div>
              <p className="text-sm font-mono text-neutral-600 leading-relaxed opacity-80">
                {template.base_prompt}
              </p>
            </motion.div>
          </div>

          {/* Right Column: Dynamic Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-3 bg-white rounded-[2.5rem] p-8 sm:p-10 border border-black/[0.04] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-neutral-900 tracking-tight">Configure Engine</h3>
                <p className="text-sm font-medium text-neutral-500">Provide variables to build the perfect deck.</p>
              </div>
            </div>

            <div className="space-y-6 mb-10">
              {template.variables && template.variables.length > 0 ? (
                template.variables.map((v: any) => (
                  <div key={v.id} className="space-y-2">
                    <label className="block text-sm font-bold text-neutral-700">
                      {v.label}
                    </label>
                    <input
                      type="text"
                      placeholder={v.placeholder}
                      value={formData[v.id] || ""}
                      onChange={(e) => setFormData({ ...formData, [v.id]: e.target.value })}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3.5 text-neutral-900 font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-neutral-400"
                    />
                  </div>
                ))
              ) : (
                <div className="bg-neutral-50 rounded-2xl p-6 border border-neutral-100 text-center">
                  <p className="text-neutral-500 font-medium">No custom variables needed. The AI engine is ready to deploy this aesthetic.</p>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full relative group overflow-hidden rounded-2xl bg-neutral-900 text-white font-bold text-lg py-4 flex items-center justify-center gap-2 hover:bg-black transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/40 to-indigo-500/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin relative z-10" />
                  <span className="relative z-10">Initializing AI...</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} className="relative z-10" />
                  <span className="relative z-10">Generate Presentation</span>
                </>
              )}
            </button>
            <p className="text-center text-xs font-semibold text-neutral-400 mt-4 uppercase tracking-widest">
              Powered by Orbstera Engine
            </p>
          </motion.div>

        </div>
      </div>
    </main>
  );
}
