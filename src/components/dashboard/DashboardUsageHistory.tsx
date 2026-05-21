'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';

type LedgerEntry = {
  delta: number;
  reason: string;
  created_at: string;
};

type DashboardUsageHistoryProps = {
  freeTier?: {
    generativeFillUsed: number;
    generativeFillLimit: number;
    magicEditUsed: number;
    magicEditLimit: number;
  } | null;
};

export function DashboardUsageHistory({ freeTier }: DashboardUsageHistoryProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/credits/ledger?limit=12');
        if (res.ok) {
          const data = (await res.json()) as { entries: LedgerEntry[] };
          if (!cancelled) setEntries(data.entries ?? []);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="rounded-md border border-white/70 bg-white p-5 shadow-sm sm:p-6"
      aria-label="Usage history"
    >
      <motion.div className="flex items-center gap-2">
        <History size={18} className="text-slate-400" strokeWidth={1.75} />
        <h2 className="font-montserrat text-lg font-bold text-slate-900">Recent credit activity</h2>
      </motion.div>

      {freeTier && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm">
            <p className="font-semibold text-amber-900">Generative Fill (free)</p>
            <p className="mt-1 text-amber-800/80">
              {freeTier.generativeFillUsed} / {freeTier.generativeFillLimit} uses this month
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-100 bg-amber-50/50 px-4 py-3 text-sm"
          >
            <p className="font-semibold text-amber-900">Magic Edit (free)</p>
            <p className="mt-1 text-amber-800/80">
              {freeTier.magicEditUsed} / {freeTier.magicEditLimit} uses this month
            </p>
          </motion.div>
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {loading && (
          <li className="text-sm text-slate-400">Loading activity…</li>
        )}
        {!loading && entries.length === 0 && (
          <li className="text-sm text-slate-400">No credit activity yet.</li>
        )}
        {entries.map((e, idx) => (
          <li
            key={`${e.created_at}-${e.reason}-${idx}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm"
          >
            <span className="truncate text-slate-600">{e.reason.replace(/_/g, ' ')}</span>
            <span className={e.delta >= 0 ? 'font-bold text-emerald-600' : 'font-bold text-slate-800'}>
              {e.delta >= 0 ? '+' : ''}
              {e.delta}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
