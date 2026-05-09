'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Clock, Grid2X2, List, Plus, Trash2,
  Crown, Presentation, MoreVertical, ExternalLink,
  Folder, AlertTriangle, X, ChevronRight, Zap
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { createClient } from '@/lib/supabase';

interface DeckMeta {
  id: string;
  title: string;
  date: string;
  createdAt?: string;
  slidesCount: number;
  theme: string;
  colorPalette: string[];
  subtitle?: string;
}

export default function DashboardPage() {
  const [presentations, setPresentations] = useState<DeckMeta[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [view, setView]                   = useState<'grid' | 'list'>('grid');
  const [deleteTarget, setDeleteTarget]   = useState<DeckMeta | null>(null);
  const [isDeleting, setIsDeleting]       = useState(false);
  const [openMenu, setOpenMenu]           = useState<string | null>(null);
  const [userPlan, setUserPlan]           = useState('free');
  const [userName, setUserName]           = useState('Creator');
  const [generationsUsed, setGenerationsUsed] = useState(0);

  useEffect(() => {
    async function init() {
      try {
        // Fetch user profile
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Creator';
          setUserName(name);
          const { data: profile } = await supabase.from('profiles').select('plan, generations_used').eq('id', user.id).single();
          if (profile) {
            setUserPlan(profile.plan?.toLowerCase() || 'free');
            setGenerationsUsed(profile.generations_used || 0);
          }
        }
        // Fetch presentations
        const res = await fetch('/api/presentations');
        if (res.ok) setPresentations(await res.json());
      } catch (e) {
        console.error('Dashboard init error:', e);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/presentations?id=${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setPresentations(prev => prev.filter(p => p.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (e) { console.error('Delete failed:', e); }
    finally { setIsDeleting(false); }
  };

  const planLabel  = userPlan === 'creator_pro' ? 'Creator Pro' : userPlan === 'pro' ? 'Student Pro' : 'Free';
  const genLimit   = userPlan === 'creator_pro' ? 100 : userPlan === 'pro' ? 30 : 3;
  const genLeft    = Math.max(0, genLimit - generationsUsed);
  const isPaid     = userPlan === 'pro' || userPlan === 'creator_pro';

  const recentDecks = presentations.slice(0, 4);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      {/* ── Delete Confirm Modal ───────────────────────────────── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-red-100"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <AlertTriangle size={28} className="text-red-500" />
              </div>
              <h3 className="text-xl font-black text-center text-gray-900 mb-2">Delete Presentation?</h3>
              <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
                "<span className="font-semibold text-gray-700">{deleteTarget.title}</span>" will be permanently deleted from Cloudflare R2. This cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 size={15} />}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto pt-28 px-6 pb-16">

        {/* ── Hero Header ────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                isPaid
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {isPaid && <Crown size={10} className="inline mr-1" />}{planLabel} Plan
              </span>
              <span className="text-[11px] text-gray-400 font-medium">
                {genLeft} generation{genLeft !== 1 ? 's' : ''} left this month
              </span>
            </div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">
              Welcome back, <span className="text-primary">{userName.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-gray-500 mt-1 text-[15px]">
              {presentations.length} presentation{presentations.length !== 1 ? 's' : ''} in your workspace
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!isPaid && (
              <Link
                href="/pricing"
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-200 hover:scale-105 transition-transform"
              >
                <Crown size={16} /> Upgrade to Pro
              </Link>
            )}
            <Link
              href="/editor"
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 hover:scale-105 transition-all"
            >
              <Plus size={18} /> New Presentation
            </Link>
          </div>
        </div>

        {/* ── Usage Bar ───────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 mb-10 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-primary" />
              <span className="text-sm font-bold text-gray-700">Monthly AI Generations</span>
            </div>
            <span className="text-sm font-black text-primary">{generationsUsed} / {genLimit}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (generationsUsed / genLimit) * 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                generationsUsed >= genLimit ? 'bg-red-400' :
                generationsUsed >= genLimit * 0.8 ? 'bg-amber-400' :
                'bg-primary'
              }`}
            />
          </div>
          {!isPaid && (
            <p className="text-[11px] text-gray-400 mt-2">
              <Link href="/pricing" className="text-primary font-bold hover:underline">Upgrade to Pro</Link> for 30 generations/mo
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="py-24 flex justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              <p className="text-gray-400 text-sm">Loading your workspace...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ── Recents ─────────────────────────────────────────── */}
            {recentDecks.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <Clock size={16} className="text-gray-400" />
                  <h2 className="text-lg font-black text-gray-800">Recent</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {recentDecks.map((deck, i) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      index={i}
                      onDelete={() => setDeleteTarget(deck)}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── All Files ────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Folder size={16} className="text-gray-400" />
                  <h2 className="text-lg font-black text-gray-800">All Presentations</h2>
                  <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{presentations.length}</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setView('grid')}
                    className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <Grid2X2 size={15} />
                  </button>
                  <button
                    onClick={() => setView('list')}
                    className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    <List size={15} />
                  </button>
                </div>
              </div>

              {presentations.length === 0 ? (
                <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-gray-200">
                  <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-5">
                    <Presentation size={36} className="text-primary/40" />
                  </div>
                  <h3 className="text-xl font-black text-gray-800 mb-2">No presentations yet</h3>
                  <p className="text-gray-400 text-sm max-w-sm mx-auto mb-7 leading-relaxed">
                    Create your first AI-powered presentation. It takes less than 30 seconds.
                  </p>
                  <Link
                    href="/editor"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
                  >
                    <Sparkles size={16} /> Create My First Presentation
                  </Link>
                </div>
              ) : view === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {presentations.map((deck, i) => (
                    <DeckCard
                      key={deck.id}
                      deck={deck}
                      index={i}
                      onDelete={() => setDeleteTarget(deck)}
                      openMenu={openMenu}
                      setOpenMenu={setOpenMenu}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm divide-y divide-gray-50">
                  {presentations.map((deck, i) => (
                    <motion.div
                      key={deck.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50/80 transition-colors group"
                    >
                      <div
                        className="w-12 h-8 rounded-lg shrink-0 border border-white/20"
                        style={{ background: `linear-gradient(135deg, ${deck.colorPalette?.[0] || '#05050A'}, ${deck.colorPalette?.[2] || '#7B61FF'})` }}
                      />
                      <div className="flex-1 min-w-0">
                        <Link href={`/editor?id=${deck.id}`}>
                          <h3 className="font-bold text-sm text-gray-900 truncate hover:text-primary transition-colors">{deck.title}</h3>
                        </Link>
                        <p className="text-xs text-gray-400">
                          {deck.slidesCount} slides · Updated {new Date(deck.date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/editor?id=${deck.id}`}
                          className="p-2 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                        >
                          <ExternalLink size={14} />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(deck)}
                          className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </motion.div>
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

// ── Deck Card Component ──────────────────────────────────────────────────────
function DeckCard({ deck, index, onDelete, openMenu, setOpenMenu }: {
  deck: DeckMeta;
  index: number;
  onDelete: () => void;
  openMenu: string | null;
  setOpenMenu: (id: string | null) => void;
}) {
  const isOpen = openMenu === deck.id;
  const bg0    = deck.colorPalette?.[0] || '#05050A';
  const bg1    = deck.colorPalette?.[2] || '#7B61FF';
  const textColor = deck.colorPalette?.[1] || '#FFFFFF';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative"
    >
      {/* Thumbnail */}
      <Link href={`/editor?id=${deck.id}`}>
        <div
          className="aspect-video rounded-2xl mb-3 relative overflow-hidden border border-white/10 group-hover:scale-[1.02] group-hover:shadow-xl transition-all duration-300"
          style={{ background: `linear-gradient(135deg, ${bg0} 0%, ${bg1}40 100%)` }}
        >
          {/* Slide preview shimmer */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />

          {/* Slide count badge */}
          <div className="absolute top-2.5 left-2.5 bg-black/30 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            {deck.slidesCount} slides
          </div>

          {/* Title overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
            <p className="text-[11px] font-bold text-white/90 line-clamp-1">{deck.title}</p>
          </div>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="bg-white/20 backdrop-blur-sm text-white text-xs font-bold px-4 py-2 rounded-full flex items-center gap-1.5">
              <ExternalLink size={12} /> Open
            </div>
          </div>
        </div>
      </Link>

      {/* Card Info */}
      <div className="flex items-start justify-between px-1">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm text-gray-900 truncate">{deck.title}</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {new Date(deck.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Context Menu */}
        <div className="relative shrink-0 ml-2">
          <button
            onClick={(e) => { e.preventDefault(); setOpenMenu(isOpen ? null : deck.id); }}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreVertical size={15} />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-0 top-8 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 w-44 z-50"
              >
                <Link
                  href={`/editor?id=${deck.id}`}
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                >
                  <ExternalLink size={14} /> Open in Editor
                </Link>
                <div className="h-px bg-gray-100 my-1" />
                <button
                  onClick={() => { setOpenMenu(null); onDelete(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
