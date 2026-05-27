'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link,
  Download,
  Code,
  X,
  Lock,
  Globe,
  Check,
  Loader2,
  FileText,
  Presentation,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ShareAccess } from '@/types/deck-meta';

type ShareTab = 'access' | 'export' | 'embed';

export type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  deckId: string;
  ownerUserId: string;
  initialShareAccess?: ShareAccess;
  onShareAccessChange?: (access: ShareAccess) => void;
  onExportPptx?: () => void;
  onExportPdf?: () => void;
};

const TABS: { id: ShareTab; label: string; icon: typeof Link }[] = [
  { id: 'access', label: 'Link & Access', icon: Link },
  { id: 'export', label: 'Export', icon: Download },
  { id: 'embed', label: 'Embed', icon: Code },
];

const ACCESS_OPTIONS: {
  value: ShareAccess;
  label: string;
  description: string;
  icon: typeof Lock;
}[] = [
  {
    value: 'private',
    label: 'Restricted',
    description: 'Only you can access',
    icon: Lock,
  },
  {
    value: 'public_view',
    label: 'Anyone with the link',
    description: 'Can view',
    icon: Globe,
  },
];

export function ShareModal({
  open,
  onClose,
  deckId,
  ownerUserId,
  initialShareAccess = 'private',
  onShareAccessChange,
  onExportPptx,
  onExportPdf,
}: ShareModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ShareTab>('access');
  const [shareAccess, setShareAccess] = useState<ShareAccess>(initialShareAccess);
  const [loadingAccess, setLoadingAccess] = useState(false);
  const [updatingAccess, setUpdatingAccess] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);

  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    // Use the canonical app URL so share links always point to production,
    // not a Vercel preview URL (e.g. orbstera-git-main-xxx.vercel.app).
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
      window.location.origin;
    return `${baseUrl}/share/${ownerUserId}/${deckId}`;
  }, [ownerUserId, deckId]);

  const embedCode = useMemo(() => {
    if (!publicUrl) return '';
    return `<iframe src="${publicUrl}" width="960" height="540" frameborder="0" allowfullscreen></iframe>`;
  }, [publicUrl]);

  const isPublic = shareAccess === 'public_view';

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setShareAccess(initialShareAccess);
    setActiveTab('access');
    setAccessError(null);
    setLinkCopied(false);
    setEmbedCopied(false);
  }, [open, initialShareAccess]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !deckId) return;
    let cancelled = false;
    setLoadingAccess(true);
    setAccessError(null);

    fetch(`/api/presentations?id=${encodeURIComponent(deckId)}`, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Failed to load (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const access =
          data.shareAccess === 'public_view' || data.shareAccess === 'private'
            ? data.shareAccess
            : 'private';
        setShareAccess(access);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setAccessError(e instanceof Error ? e.message : 'Failed to load sharing settings');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, deckId]);

  const patchShareAccess = useCallback(
    async (next: ShareAccess) => {
      if (next === shareAccess || updatingAccess) return;
      setUpdatingAccess(true);
      setAccessError(null);
      const prev = shareAccess;
      setShareAccess(next);

      try {
        const res = await fetch(`/api/presentations?id=${encodeURIComponent(deckId)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shareAccess: next }),
          cache: 'no-store',
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Update failed (${res.status})`);
        onShareAccessChange?.(next);
      } catch (e: unknown) {
        setShareAccess(prev);
        setAccessError(e instanceof Error ? e.message : 'Failed to update access');
      } finally {
        setUpdatingAccess(false);
      }
    },
    [deckId, shareAccess, updatingAccess, onShareAccessChange],
  );

  const copyToClipboard = async (text: string, kind: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === 'link') {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      } else {
        setEmbedCopied(true);
        setTimeout(() => setEmbedCopied(false), 2000);
      }
    } catch {
      setAccessError('Could not copy to clipboard');
    }
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="share-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[600] flex items-center justify-center overflow-y-auto overscroll-contain p-4 sm:p-6 safe-pad-y"
          role="presentation"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" aria-hidden />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            className="relative z-[1] my-auto flex w-full max-w-4xl max-h-[min(88dvh,720px)] min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-16px_rgba(15,23,42,0.28)] ring-1 ring-slate-200 sm:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar */}
            <nav className="hidden shrink-0 flex-col border-b border-slate-200 bg-slate-50/90 sm:flex sm:w-[210px] sm:border-b-0 sm:border-r">
              <div className="border-b border-slate-200 px-5 py-4 sm:border-b-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Share
                </p>
                <h2
                  id="share-modal-title"
                  className="mt-2 text-lg font-bold text-slate-900"
                >
                  Share deck
                </h2>
              </div>
              <ul className="flex flex-row gap-1 overflow-x-auto p-3 sm:flex-col sm:gap-0.5 sm:p-3 sm:pt-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <li key={tab.id} className="shrink-0 sm:shrink">
                      <button
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold whitespace-nowrap transition-colors',
                          active
                            ? 'text-primary'
                            : 'text-slate-600 hover:bg-white/80 hover:text-slate-900',
                        )}
                      >
                        <Icon
                          size={16}
                          strokeWidth={1.75}
                          className={active ? 'text-primary' : 'text-slate-400'}
                        />
                        {tab.label}
                        {active && (
                          <motion.div
                            layoutId="share-tab-indicator"
                            className="absolute inset-0 rounded-lg bg-white ring-1 ring-slate-200 shadow-sm -z-10"
                            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Main */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-8 sm:py-5">
                <div className="min-w-0 sm:hidden">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Share
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-slate-900">
                    Share deck
                  </h2>
                </div>
                <div className="hidden min-w-0 flex-1 sm:block">
                  {activeTab === 'access' && (
                    <>
                      <h3 className="text-xl font-bold text-slate-900">
                        Share this presentation
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Control who can view your deck and copy a shareable link.
                      </p>
                    </>
                  )}
                  {activeTab === 'export' && (
                    <>
                      <h3 className="text-xl font-bold text-slate-900">Export</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Download your presentation in popular formats.
                      </p>
                    </>
                  )}
                  {activeTab === 'embed' && (
                    <>
                      <h3 className="text-xl font-bold text-slate-900">Embed</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Paste this code into your website or Notion page.
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close share modal"
                >
                  <X size={20} strokeWidth={1.75} />
                </button>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-8 sm:py-6">
                <AnimatePresence mode="wait">
                  {activeTab === 'access' && (
                    <motion.div
                      key="access"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="sm:hidden">
                        <h3 className="text-lg font-bold text-slate-900">
                          Share this presentation
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Control who can view your deck and copy a shareable link.
                        </p>
                      </div>

                      <section className="rounded-xl bg-slate-50/90 p-5 ring-1 ring-slate-200 backdrop-blur-sm sm:p-6">
                        <h4 className="text-sm font-bold text-slate-900">General access</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          Choose who can open this presentation.
                        </p>

                        {loadingAccess ? (
                          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
                            <Loader2 size={18} className="animate-spin" strokeWidth={1.75} />
                            Loading settings…
                          </div>
                        ) : (
                          <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {ACCESS_OPTIONS.map((opt) => {
                              const Icon = opt.icon;
                              const selected = shareAccess === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={updatingAccess}
                                  onClick={() => patchShareAccess(opt.value)}
                                  className={cn(
                                    'relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all',
                                    selected
                                      ? 'border-primary/40 bg-primary/5 ring-2 ring-primary/20'
                                      : 'border-slate-200 bg-white hover:border-slate-300',
                                    updatingAccess && 'opacity-70',
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon
                                      size={16}
                                      strokeWidth={1.75}
                                      className={selected ? 'text-primary' : 'text-slate-500'}
                                    />
                                    <span className="text-sm font-bold text-slate-900">
                                      {opt.label}
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-600">{opt.description}</span>
                                  {selected && updatingAccess && (
                                    <Loader2
                                      size={14}
                                      className="absolute top-3 right-3 animate-spin text-primary"
                                      strokeWidth={1.75}
                                    />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {accessError && (
                          <p className="mt-3 text-sm text-red-600" role="alert">
                            {accessError}
                          </p>
                        )}
                      </section>

                      <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-900">Public link</label>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                          <input
                            type="text"
                            readOnly
                            value={publicUrl}
                            className={cn(
                              'min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-xs text-slate-700 sm:text-sm',
                              !isPublic && 'opacity-60',
                            )}
                            aria-label="Share link"
                          />
                          <button
                            type="button"
                            disabled={!isPublic || !publicUrl}
                            onClick={() => copyToClipboard(publicUrl, 'link')}
                            className={cn(
                              'inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white transition-all',
                              isPublic
                                ? 'bg-primary hover:opacity-90 active:scale-[0.98]'
                                : 'cursor-not-allowed bg-slate-300',
                            )}
                          >
                            {linkCopied ? (
                              <>
                                <Check size={16} strokeWidth={1.75} />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy size={16} strokeWidth={1.75} />
                                Copy link
                              </>
                            )}
                          </button>
                        </div>
                        {!isPublic && (
                          <p className="text-xs text-slate-600">
                            Set access to &quot;Anyone with the link&quot; to enable copying and
                            sharing.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'export' && (
                    <motion.div
                      key="export"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="sm:hidden">
                        <h3 className="text-lg font-bold text-slate-900">Export</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Download your presentation in popular formats.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => {
                            onExportPdf?.();
                            onClose();
                          }}
                          className="group flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 text-left ring-1 ring-slate-200 transition-all hover:border-primary/30 hover:shadow-md"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50/50">
                            <img src="/pdf-icon.png" alt="PDF Icon" className="h-10 w-10 object-contain" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">PDF</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Static slides for print and email.
                            </p>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onExportPptx?.();
                            onClose();
                          }}
                          className="group flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-6 text-left ring-1 ring-slate-200 transition-all hover:border-primary/30 hover:shadow-md"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-50/50">
                            <img src="/ppt-icon.png" alt="PowerPoint Icon" className="h-10 w-10 object-contain" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900">PowerPoint</h4>
                            <p className="mt-1 text-sm text-slate-600">
                              Editable PPTX for Microsoft Office.
                            </p>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'embed' && (
                    <motion.div
                      key="embed"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div className="sm:hidden">
                        <h3 className="text-lg font-bold text-slate-900">Embed</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          Paste this code into your website or Notion page.
                        </p>
                      </div>

                      {!isPublic && (
                        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                          Embedding only works when general access is set to &quot;Anyone with the
                          link&quot;.
                        </p>
                      )}

                      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-5 text-xs leading-relaxed text-slate-300 ring-1 ring-slate-700">
                        <code>{embedCode || 'Loading…'}</code>
                      </pre>

                      <button
                        type="button"
                        disabled={!isPublic || !embedCode}
                        onClick={() => copyToClipboard(embedCode, 'embed')}
                        className={cn(
                          'inline-flex min-h-[44px] items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold text-white transition-all',
                          isPublic
                            ? 'bg-primary hover:opacity-90'
                            : 'cursor-not-allowed bg-slate-300',
                        )}
                      >
                        {embedCopied ? (
                          <>
                            <Check size={16} strokeWidth={1.75} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} strokeWidth={1.75} />
                            Copy embed code
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
