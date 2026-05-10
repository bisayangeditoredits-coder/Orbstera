'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import {
  User,
  Mail,
  CreditCard,
  LogOut,
  Crown,
  ChevronRight,
  LayoutDashboard,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');

  const isPro =
    profile?.plan === 'creator_pro' ||
    profile?.plan === 'student_pro' ||
    profile?.plan === 'pro';
  const planName =
    profile?.plan === 'creator_pro'
      ? 'Creator Pro'
      : profile?.plan === 'student_pro'
        ? 'Student Pro'
        : profile?.plan === 'pro'
          ? 'Pro'
          : 'Free';

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        if (profileData) setProfile(profileData);
      }
      setLoading(false);
    };
    getUser();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleUpgrade = async (planId: string) => {
    setUpgrading(planId);
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error);
    } catch {
      alert('Failed to initiate upgrade');
    } finally {
      setUpgrading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[#F7F7F5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-neutral-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || 'Creator';

  const used = profile?.generations_used || 0;
  const max =
    profile?.plan === 'creator_pro'
      ? 100
      : profile?.plan === 'student_pro'
        ? 30
        : 3;
  const remaining = Math.max(0, max - used);
  const percentUsed = Math.min(100, Math.round((used / max) * 100));

  const tabClass = (tab: 'profile' | 'billing') =>
    `flex items-center gap-3 w-full px-4 py-3 rounded-xl text-[13px] font-semibold transition-all duration-200 ${
      activeTab === tab
        ? 'bg-neutral-900 text-white shadow-md shadow-neutral-900/10'
        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
    }`;

  return (
    <div className="min-h-dvh bg-[#F7F7F5] text-neutral-900 antialiased">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10 lg:mb-12">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary mb-2">
              Account
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
              Settings
            </h1>
            <p className="text-neutral-500 mt-2 text-[15px] max-w-md leading-relaxed">
              Profile, plan, and usage — everything for your Orbstera workspace.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-full text-[13px] font-semibold text-neutral-700 bg-white border border-neutral-200/90 shadow-sm hover:border-neutral-300 hover:bg-neutral-50 transition-colors"
          >
            <LayoutDashboard size={16} strokeWidth={1.75} className="text-neutral-500" />
            Dashboard
            <ChevronRight size={16} className="text-neutral-400 -mr-0.5" strokeWidth={1.75} />
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-14">
          {/* Side nav */}
          <aside className="lg:w-56 shrink-0">
            <nav
              className="flex lg:flex-col gap-1 p-1.5 rounded-2xl bg-white border border-neutral-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              aria-label="Settings sections"
            >
              <button type="button" onClick={() => setActiveTab('profile')} className={tabClass('profile')}>
                <User size={18} strokeWidth={1.75} className={activeTab === 'profile' ? 'text-white' : 'text-neutral-400'} />
                Profile
              </button>
              <button type="button" onClick={() => setActiveTab('billing')} className={tabClass('billing')}>
                <CreditCard size={18} strokeWidth={1.75} className={activeTab === 'billing' ? 'text-white' : 'text-neutral-400'} />
                Plan &amp; usage
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div className="flex-1 min-w-0 max-w-3xl">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <section className="rounded-2xl bg-white border border-neutral-200/90 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-neutral-100">
                    <h2 className="text-lg font-semibold text-neutral-900">Profile</h2>
                    <p className="text-sm text-neutral-500 mt-1">Signed in with your provider. Email is managed by your login.</p>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="relative shrink-0">
                        <div className="w-20 h-20 rounded-2xl ring-2 ring-white shadow-lg shadow-neutral-900/5 overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 border border-neutral-100">
                          {avatarUrl ? (
                            <img
                              src={avatarUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                              {user?.email?.[0]?.toUpperCase() ?? '?'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold text-neutral-900 tracking-tight truncate">{fullName}</h3>
                        <div className="flex items-center gap-2 text-neutral-500 mt-2">
                          <Mail size={15} strokeWidth={1.75} className="shrink-0 text-neutral-400" />
                          <span className="text-[15px] truncate">{user?.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8">
                      <label className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
                        User ID
                      </label>
                      <div className="rounded-xl bg-neutral-50 border border-neutral-200/80 px-4 py-3 font-mono text-[12px] text-neutral-600 break-all select-all">
                        {user?.id}
                      </div>
                      <p className="text-xs text-neutral-400 mt-2">Reference for support. Read-only.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl border border-red-200/60 bg-red-50/40 px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-neutral-900">Sign out</h3>
                    <p className="text-sm text-neutral-500 mt-1 max-w-sm">
                      End your session on this device. You can sign in again anytime.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-red-700 bg-white border border-red-200/80 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                  >
                    <LogOut size={16} strokeWidth={1.75} />
                    Sign out
                  </button>
                </section>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-6"
              >
                <section className="rounded-2xl bg-white border border-neutral-200/90 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] overflow-hidden">
                  <div className="px-6 sm:px-8 pt-8 pb-6 border-b border-neutral-100 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Current plan</h2>
                      <p className="text-sm text-neutral-500 mt-1">Billing and generation limits for this workspace.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
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
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80">
                          <Crown size={11} className="text-amber-600" strokeWidth={1.75} />
                          Active
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="rounded-xl bg-neutral-50/80 border border-neutral-200/60 p-5 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                        <div>
                          <h4 className="font-semibold text-neutral-900 text-[15px]">Monthly generations</h4>
                          <p className="text-[13px] text-neutral-500 mt-1">Credits refresh each billing period.</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-3xl font-bold tabular-nums text-neutral-900">{remaining}</span>
                          <span className="text-sm font-medium text-neutral-500 ml-1.5">left</span>
                        </div>
                      </div>

                      <div className="h-2 rounded-full bg-neutral-200/80 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            percentUsed > 90 ? 'bg-red-500' : 'bg-primary'
                          }`}
                          style={{ width: `${percentUsed}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-3 text-[12px] font-medium text-neutral-500">
                        <span>{used} used</span>
                        <span>{max} included</span>
                      </div>
                    </div>
                  </div>
                </section>

                {!isPro && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-white border border-neutral-200/90 p-6 sm:p-7 shadow-sm hover:border-neutral-300 transition-colors flex flex-col">
                      <h3 className="text-lg font-semibold text-neutral-900">Student Pro</h3>
                      <p className="text-[13px] text-neutral-500 mt-2 leading-relaxed flex-1">
                        Watermark-free exports and more generations for coursework and side projects.
                      </p>
                      <div className="flex items-baseline gap-1 mt-6 mb-6">
                        <span className="text-3xl font-bold text-neutral-900">$5</span>
                        <span className="text-sm text-neutral-500">/mo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpgrade('student_pro')}
                        disabled={upgrading !== null}
                        className="w-full py-3 rounded-xl text-[14px] font-semibold text-neutral-900 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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

                    <div className="rounded-2xl bg-white border-2 border-primary/35 p-6 sm:p-7 shadow-[0_8px_30px_-12px_rgba(59,130,246,0.25)] relative flex flex-col ring-1 ring-primary/10">
                      <div className="absolute top-0 right-0 px-3 py-1.5 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-xl">
                        Best value
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2 pr-16">
                        Creator Pro
                        <Crown size={17} className="text-amber-500 shrink-0" strokeWidth={1.75} />
                      </h3>
                      <p className="text-[13px] text-primary/90 mt-2 leading-relaxed flex-1">
                        Top-tier models and 100 generations per month for serious creators.
                      </p>
                      <div className="flex items-baseline gap-1 mt-6 mb-6">
                        <span className="text-3xl font-bold text-neutral-900">$19</span>
                        <span className="text-sm text-neutral-500">/mo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpgrade('creator_pro')}
                        disabled={upgrading !== null}
                        className="w-full py-3 rounded-xl text-[14px] font-semibold text-white bg-primary hover:bg-primaryHover border border-transparent shadow-md shadow-primary/25 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
                  </div>
                )}

                {profile?.plan === 'student_pro' && (
                  <div className="rounded-2xl bg-gradient-to-br from-primary/[0.07] to-white border border-primary/20 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
                        Step up to Creator Pro
                        <Crown size={18} className="text-amber-500" strokeWidth={1.75} />
                      </h3>
                      <p className="text-sm text-neutral-600 mt-2 max-w-md leading-relaxed">
                        Unlock premium intelligence and 100 monthly generations for $19/mo.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUpgrade('creator_pro')}
                      disabled={upgrading !== null}
                      className="shrink-0 px-6 py-3 rounded-xl text-[14px] font-semibold text-white bg-primary hover:bg-primaryHover shadow-md shadow-primary/25 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2"
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
              </motion.div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
