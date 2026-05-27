import type { ComponentType } from 'react';
import { Download, ShieldCheck, Sparkles, Users, Database } from 'lucide-react';
import { MarketingPageLayout } from '@/components/layout/MarketingPageLayout';
import { getStatusSnapshot } from '@/lib/health/status-snapshot';

type IconComponent = ComponentType<any>;

type Service = {
  label: string;
  Icon: IconComponent;
  checkKeys: string[];
};

const SERVICES: Service[] = [
  { label: 'AI Generation', Icon: Sparkles, checkKeys: ['openrouter', 'worker'] },
  { label: 'File Export (PPTX)', Icon: Download, checkKeys: ['r2'] },
  { label: 'Authentication', Icon: ShieldCheck, checkKeys: ['supabase'] },
  { label: 'Storage (Cloudflare R2)', Icon: Database, checkKeys: ['r2'] },
  { label: 'Real-time Collaboration', Icon: Users, checkKeys: ['redis', 'queue'] },
];

function isOperational(checks: Record<string, string>, keys: string[]) {
  return keys.every((key) => {
    if (key === 'queue' && checks.queue === 'error') return false;
    const value = checks[key];
    if (!value) return true;
    return !['missing_env', 'unreachable', 'misconfigured', 'error'].includes(value);
  });
}

export default async function StatusPage() {
  const snapshot = await getStatusSnapshot().catch(() => ({
    status: 'degraded' as const,
    checks: {
      openrouter: 'error',
      supabase: 'error',
      r2: 'error',
      redis: 'error',
      queue: 'error',
      worker: 'error',
    },
    queue: null,
    worker: { queueEnabled: false, misconfigured: true },
    region: null,
    ts: new Date().toISOString(),
  }));

  return (
    <MarketingPageLayout
      title="System Status"
      description={`Live platform checks as of ${new Date(snapshot.ts).toLocaleString()}.`}
      className="font-mono"
    >
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {SERVICES.map(({ label, Icon, checkKeys }) => {
            const operational = isOperational(snapshot.checks, checkKeys);
            return (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white px-4 py-4"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 border border-black/[0.04]">
                  <Icon size={18} strokeWidth={1.5} className="text-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 truncate">{label}</div>
                  <div className="mt-1 inline-flex items-center gap-2 text-xs text-slate-600">
                    <span
                      className={`h-2 w-2 rounded-full ${operational ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      aria-hidden
                    />
                    {operational ? 'Operational ✓' : 'Degraded'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </MarketingPageLayout>
  );
}

