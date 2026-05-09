'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Folder, Clock, MoreHorizontal, Grid2X2, List, Sparkles } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';

export default function DashboardPage() {
  const [presentations, setPresentations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPresentations() {
      try {
        const res = await fetch('/api/presentations');
        if (res.ok) {
          const data = await res.json();
          setPresentations(data);
        }
      } catch (error) {
        console.error('Failed to fetch presentations:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPresentations();
  }, []);

  // Use the most recent 4 for the top row
  const recentDecks = presentations.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto pt-24 px-6 pb-12">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-3xl font-space-grotesk font-bold">Welcome back, Creator</h1>
            <p className="text-textMuted mt-1">You have 3 generations left on your free plan.</p>
          </div>
          <Link
            href="/editor"
            className="flex items-center gap-2 px-6 py-3 bg-textMain text-background rounded-full font-medium hover:scale-105 transition-transform shadow-neon-primary"
          >
            <Sparkles size={18} />
            <span>New Generation</span>
          </Link>
        </div>

        {isLoading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Recent Section */}
            {recentDecks.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Clock size={18} className="text-textMuted" />
                  <h2 className="text-xl font-semibold">Recent Presentations</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {recentDecks.map(deck => (
                    <div key={deck.id} className="group">
                      <Link href={`/editor?id=${deck.id}`}>
                        <div 
                          className="aspect-video rounded-xl border border-white/10 mb-3 relative overflow-hidden group-hover:border-primary/50 transition-all group-hover:scale-[1.02] shadow-lg"
                          style={{ backgroundColor: deck.colorPalette?.[0] || '#111' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                          <div className="absolute inset-5 flex flex-col justify-center items-center text-center">
                            <h4 
                              className="font-space-grotesk font-bold text-[14px] leading-tight line-clamp-3 w-full"
                              style={{ color: deck.colorPalette?.[1] || '#fff' }}
                            >
                              {deck.title}
                            </h4>
                            {deck.subtitle && (
                              <p 
                                className="text-[10px] mt-2 line-clamp-2 opacity-80"
                                style={{ color: deck.colorPalette?.[2] || deck.colorPalette?.[3] || '#aaa' }}
                              >
                                {deck.subtitle}
                              </p>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors duration-300" />
                        </div>
                      </Link>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-sm text-textMain truncate w-48">{deck.title}</h3>
                          <p className="text-xs text-textMuted">{new Date(deck.date).toLocaleDateString()}</p>
                        </div>
                        <button className="text-textMuted hover:text-white p-1">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All Files */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Folder size={18} className="text-textMuted" />
                  <h2 className="text-xl font-semibold">All Files</h2>
                </div>
                <div className="flex items-center gap-2 bg-surface border border-white/10 rounded-lg p-1">
                  <button className="p-1.5 bg-white/10 rounded text-white"><Grid2X2 size={16} /></button>
                  <button className="p-1.5 text-textMuted hover:text-white rounded"><List size={16} /></button>
                </div>
              </div>

              {presentations.length === 0 ? (
                <div className="text-center py-20 glass-panel border-white/5 rounded-xl">
                  <Folder size={48} className="mx-auto text-textMuted mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-textMain mb-2">No presentations yet</h3>
                  <p className="text-textMuted text-sm max-w-sm mx-auto mb-6">
                    Create your first cinematic presentation using AI generation or start from scratch.
                  </p>
                  <Link href="/editor" className="inline-flex items-center gap-2 px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-full transition-colors border border-white/10">
                    <Sparkles size={16} /> Create Now
                  </Link>
                </div>
              ) : (
                <div className="glass-panel border-white/5 divide-y divide-white/5 rounded-xl overflow-hidden">
                  {presentations.map((deck) => (
                    <div key={deck.id} className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded bg-surface border border-white/10 flex items-center justify-center text-primary">
                          <Folder size={18} />
                        </div>
                        <div>
                          <Link href={`/editor?id=${deck.id}`} className="hover:text-primary transition-colors">
                            <h3 className="font-medium text-sm">{deck.title}</h3>
                          </Link>
                          <p className="text-xs text-textMuted">Updated {new Date(deck.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-textMuted">
                        <span className="hidden sm:inline">{deck.slidesCount || 0} slides</span>
                        <div className="flex -space-x-2">
                          <div className="w-6 h-6 rounded-full bg-blue-500 border border-background" />
                          <div className="w-6 h-6 rounded-full bg-emerald-500 border border-background" />
                        </div>
                        <button className="hover:text-white p-1">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
