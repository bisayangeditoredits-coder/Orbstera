'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Wand2, LayoutTemplate, Zap, Home } from 'lucide-react';

type DashboardQuickToolsProps = {
  onNewDeck: () => void;
  onOpenSettings: () => void;
  isFreePlan: boolean;
};

const tools = [
  {
    id: 'new',
    label: 'New deck',
    description: 'Start from a blank canvas',
    icon: Plus,
    accent: 'primary' as const,
  },
  {
    id: 'editor',
    label: 'AI editor',
    description: 'Open the presentation studio',
    icon: Wand2,
    accent: 'violet' as const,
    href: '/editor',
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Browse starter layouts',
    icon: LayoutTemplate,
    accent: 'emerald' as const,
    href: '/#templates',
  },
  {
    id: 'home',
    label: 'Product tour',
    description: 'See what Orbstera can do',
    icon: Home,
    accent: 'slate' as const,
    href: '/',
  },
];

const accentStyles = {
  primary: 'bg-primary/10 text-primary group-hover:bg-primary/15',
  violet: 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-500/15',
  emerald: 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500/15',
  slate: 'bg-slate-500/10 text-slate-600 group-hover:bg-slate-500/15',
};

export function DashboardQuickTools({
  onNewDeck,
  onOpenSettings,
  isFreePlan,
}: DashboardQuickToolsProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
      aria-label="Quick actions"
      className="space-y-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tools</p>
          <h2 className="mt-1 font-montserrat text-lg font-bold text-slate-900">Quick actions</h2>
        </div>
        {isFreePlan && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-primary transition hover:bg-primary/10"
          >
            <Zap size={13} strokeWidth={1.75} />
            Upgrade plan
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {tools.map((tool, i) => {
          const Icon = tool.icon;
          const inner = (
            <>
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl transition ${accentStyles[tool.accent]}`}
              >
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900">{tool.label}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">
                  {tool.description}
                </p>
              </div>
            </>
          );

          const className =
            'group flex min-h-[100px] flex-col gap-3 rounded-2xl border border-white/70 bg-white p-4 shadow-sm transition hover:border-primary/20 hover:shadow-md sm:min-h-[110px] sm:p-5';

          if (tool.id === 'new') {
            return (
              <motion.button
                key={tool.id}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                onClick={onNewDeck}
                className={`${className} text-left`}
              >
                {inner}
              </motion.button>
            );
          }

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.04 }}
            >
              <Link href={tool.href!} className={className}>
                {inner}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
