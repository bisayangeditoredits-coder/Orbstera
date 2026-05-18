'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  CreditCard,
  LogOut,
  Crown,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { CreditState } from '@/hooks/useCredits';
import { formatPlanLabel } from './dashboard-utils';
import { cn } from '@/lib/cn';

type SettingsTab = 'profile' | 'billing';

type DashboardSettingsProps = {
  credits: CreditState;
  className?: string;
};

export function DashboardSettings({ credits, className }: DashboardSettingsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{
    id: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  } | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();
      if (profileData) setProfile(profileData as Record<string, unknown>);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const plan = String(profile?.plan ?? credits.plan ?? 'free');
  const isPro =
    plan === 'creator_pro' || plan === 'student_pro' || plan === 'pro';
  const planName = formatPlanLabel(plan);

  const used =
    typeof profile?.credits_used_month === 'number'
      ? profile.credits_used_month
      : credits.used;
  const max =
    typeof profile?.credits_monthly_limit === 'number'
      ? profile.credits_monthly_limit
      : credits.monthlyLimit;
  const remaining = Math.max(0, max - used);
  const percentUsed = Math.min(100, max > 0 ? Math.round((used / max) * 100) : 0);

  const handleLogout = async () => {
    const { signOutAndClearCaches } = await import('@/lib/auth/logout');
    await signOutAndClearCaches(supabase, user?.id);
    router.push('/login');
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      if (res.status === 401) {
        window.location.href = '/login?next=/my-presentations%23settings';
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch {
      alert('Failed to initiate upgrade. Please try again.');
    } finally {
      setUpgrading(null);
    }
  };

  const tabClass = (tab: SettingsTab) =>
    cn(
      'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200',
      activeTab === tab
        ? 'bg-primary text-white shadow-md shadow-primary/20'
        : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
    );

  if (loading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-24', className)}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary"
        />
        <p className="mt-4 text-sm font-medium text-slate-500">Loading settings…</p>
      </div>
    );
  }

  const avatarUrl =
    (user?.user_metadata?.avatar_url as string | undefined) ||
    (user?.user_metadata?.picture as string | undefined);
  const fullName = (user?.user_metadata?.full_name as string | undefined) || 'Creator';

  return (
    <section
      id="settings"
      className={cn('scroll-mt-6 space-y-8', className)}
      aria-label="Account settings"
    >
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Your workspace</p>
        <h2
          className="mt-1 font-montserrat text-2xl font-bold text-slate-900 sm:text-3xl"
          style={{ fontFamily: 'var(--font-space-grotesk), ui-sans-serif, system-ui' }}
        >
          Account
        </h2>
        <p className="mt-2 max-w-lg text-sm text-slate-500">
          Profile, plan, and usage — all managed here in your workspace.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="flex flex-col gap-8 lg:flex-row lg:gap-10"
      >
        <aside className="lg:w-52 shrink-0">
          <nav
            className="flex gap-1 rounded-2xl border border-white/70 bg-white/80 p-1.5 shadow-sm backdrop-blur-sm lg:flex-col"
            aria-label="Settings sections"
          >
            <button type="button" onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
              <User
                size={18}
                strokeWidth={1.75}
                className={activeTab === 'profile' ? 'text-white' : 'text-slate-400'}
              />
              Profile
            </button>
            <button type="button" onClick={() => setActiveTab('billing')} className={tabClass('billing')}>
              <CreditCard
                size={18}
                strokeWidth={1.75}
                className={activeTab === 'billing' ? 'text-white' : 'text-slate-400'}
              />
              Plan &amp; usage
            </button>
          </nav>
        </aside>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-w-0 flex-1 max-w-3xl space-y-6"
        >
          {activeTab === 'profile' && (
            <>
              <section className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="border-b border-slate-100 px-6 py-6 sm:px-8"
                >
                  <h3 className="text-lg font-semibold text-slate-900">Profile</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Signed in with your provider. Email is managed by your login.
                  </p>
                </motion.div>
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg ring-2 ring-white"
                    >
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-primary">
                          {user?.email?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </motion.div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-xl font-semibold text-slate-900">{fullName}</h4>
                      <div className="mt-2 flex items-center gap-2 text-slate-500">
                        <Mail size={15} strokeWidth={1.75} className="shrink-0 text-slate-400" />
                        <span className="truncate text-[15px]">{user?.email}</span>
                      </div>
                    </div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className="mt-8"
                  >
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      User ID
                    </label>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 font-mono text-[12px] text-slate-600 break-all select-all"
                    >
                      {user?.id}
                    </motion.div>
                    <p className="mt-2 text-xs text-slate-400">Reference for support. Read-only.</p>
                  </motion.div>
                </div>
              </section>

              <section className="flex flex-col gap-4 rounded-3xl border border-red-200/60 bg-red-50/50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <div>
                  <h3 className="text-[15px] font-semibold text-slate-900">Sign out</h3>
                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    End your session on this device. You can sign in again anytime.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-red-200/80 bg-white px-5 py-2.5 text-[13px] font-semibold text-red-700 shadow-sm transition hover:border-red-300 hover:bg-red-50"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                  Sign out
                </button>
              </section>
            </>
          )}

          {activeTab === 'billing' && (
            <>
              <section className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 px-6 py-6 sm:px-8">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Current plan</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Billing and generation limits for this workspace.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-[12px] font-semibold text-slate-800">
                      {isPro ? (
                        <>
                          <Sparkles size={13} className="text-primary" strokeWidth={1.75} />
                          {planName}
                        </>
                      ) : (
                        'Free'
                      )}
                    </span>
                    {isPro && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                        <Crown size={11} className="text-amber-600" strokeWidth={1.75} />
                        Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-6 sm:p-8">
                  <div className="rounded-2xl border border-slate-200/60 bg-slate-50/80 p-5 sm:p-6">
                    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                      >
                        <h4 className="text-[15px] font-semibold text-slate-900">Monthly generations</h4>
                        <p className="mt-1 text-[13px] text-slate-500">
                          Credits refresh each billing period.
                        </p>
                      </motion.div>
                      <div className="text-left sm:text-right">
                        <span className="text-3xl font-bold tabular-nums text-slate-900">{remaining}</span>
                        <span className="ml-1.5 text-sm font-medium text-slate-500">left</span>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200/80">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-500',
                          percentUsed > 90 ? 'bg-red-500' : 'bg-primary',
                        )}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <div className="mt-3 flex justify-between text-[12px] font-medium text-slate-500">
                      <span>{used} used</span>
                      <span>{max} included</span>
                    </div>
                  </div>
                </div>
              </section>

              {!isPro && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className="grid grid-cols-1 gap-4 sm:grid-cols-2"
                >
                  <div className="flex flex-col rounded-3xl border border-white/70 bg-white p-6 shadow-sm transition hover:shadow-md sm:p-7">
                    <h3 className="text-lg font-semibold text-slate-900">Student Pro</h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-slate-500">
                      Watermark-free exports and ~900 monthly credits for coursework and side projects.
                    </p>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      className="mb-6 mt-6 flex items-baseline gap-1"
                    >
                      <span className="text-3xl font-bold text-slate-900">$5</span>
                      <span className="text-sm text-slate-500">/mo</span>
                    </motion.div>
                    <button
                      type="button"
                      onClick={() => handleUpgrade('student_pro')}
                      disabled={upgrading !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-[14px] font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {upgrading === 'student_pro' ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-primary" strokeWidth={1.75} />
                          Redirecting…
                        </>
                      ) : (
                        'Upgrade to Student Pro'
                      )}
                    </button>
                  </div>

                  <div className="relative flex flex-col rounded-3xl border-2 border-primary/35 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.25)] ring-1 ring-primary/10 sm:p-7">
                    <div className="absolute right-0 top-0 rounded-bl-xl bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Best value
                    </div>
                    <h3 className="flex items-center gap-2 pr-16 text-lg font-semibold text-slate-900">
                      Creator Pro
                      <Crown size={17} className="shrink-0 text-amber-500" strokeWidth={1.75} />
                    </h3>
                    <p className="mt-2 flex-1 text-[13px] leading-relaxed text-primary/90">
                      Top-tier models and ~3,500 credits/month (~10 premium Creator decks).
                    </p>
                    <div className="mb-6 mt-6 flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-slate-900">$19</span>
                      <span className="text-sm text-slate-500">/mo</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpgrade('creator_pro')}
                      disabled={upgrading !== null}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-[14px] font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-primaryHover disabled:opacity-50"
                    >
                      {upgrading === 'creator_pro' ? (
                        <>
                          <Loader2 size={18} className="animate-spin text-white/90" strokeWidth={1.75} />
                          Redirecting…
                        </>
                      ) : (
                        'Upgrade to Creator Pro'
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {plan === 'student_pro' && (
                <div className="flex flex-col gap-6 rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.07] to-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      Step up to Creator Pro
                      <Crown size={18} className="text-amber-500" strokeWidth={1.75} />
                    </h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-600">
                      Unlock premium intelligence and ~3,500 monthly credits for $19/mo.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUpgrade('creator_pro')}
                    disabled={upgrading !== null}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[14px] font-semibold text-white shadow-md shadow-primary/25 transition hover:bg-primaryHover disabled:opacity-50"
                  >
                    {upgrading === 'creator_pro' ? (
                      <>
                        <Loader2 size={18} className="animate-spin" strokeWidth={1.75} />
                        Redirecting…
                      </>
                    ) : (
                      'Upgrade now'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
