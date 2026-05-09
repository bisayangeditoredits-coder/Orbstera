'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { User, Mail, CreditCard, Shield, LogOut, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'profile' | 'billing'>('profile');

  const isPro = profile?.plan === 'creator_pro' || profile?.plan === 'student_pro' || profile?.plan === 'pro';
  const planName = profile?.plan === 'creator_pro' ? 'Creator Pro' : profile?.plan === 'student_pro' ? 'Student Pro' : profile?.plan === 'pro' ? 'Pro' : 'Free';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    } catch (err) {
      alert('Failed to initiate upgrade');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-textMuted text-sm font-medium tracking-wide">Loading settings...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const fullName = user?.user_metadata?.full_name || 'Creator';
  
  const used = profile?.generations_used || 0;
  const max = profile?.plan === 'creator_pro' ? 100 : profile?.plan === 'student_pro' ? 30 : 3;
  const remaining = Math.max(0, max - used);
  const percentUsed = Math.min(100, Math.round((used / max) * 100));

  return (
    <div className="min-h-screen bg-background text-textMain selection:bg-primary/30">
      <Navbar />
      
      <main className="max-w-5xl mx-auto pt-32 px-6 pb-24">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-space-grotesk font-black tracking-tight bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">
            Account Settings
          </h1>
          <p className="text-textMuted mt-3 text-[15px] max-w-xl leading-relaxed">
            Manage your personal information, subscription plan, and billing details.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-12">
          {/* Sidebar Navigation */}
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-300 ${
                activeTab === 'profile' 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                  : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
              }`}
            >
              <User size={18} className={activeTab === 'profile' ? 'text-primary' : ''} /> 
              Profile Details
            </button>
            <button 
              onClick={() => setActiveTab('billing')}
              className={`flex items-center gap-3 w-full px-5 py-3.5 rounded-xl text-[14px] font-semibold transition-all duration-300 ${
                activeTab === 'billing' 
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                  : 'text-textMuted hover:text-textMain hover:bg-white/5 border border-transparent'
              }`}
            >
              <CreditCard size={18} className={activeTab === 'billing' ? 'text-primary' : ''} /> 
              Billing & Usage
            </button>
          </nav>

          {/* Content Area */}
          <div className="relative min-h-[500px]">
            {activeTab === 'profile' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="bg-surface border border-borderSubtle rounded-2xl p-8 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary/50 to-purple-500/50 opacity-50 group-hover:opacity-100 transition-opacity" />
                  
                  <div className="flex items-center gap-6 mb-10">
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary to-purple-600 p-[3px] shadow-lg">
                      <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span className="text-3xl font-bold text-textMain uppercase">{user?.email?.[0]}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-textMain tracking-tight">{fullName}</h3>
                      <div className="flex items-center gap-2 text-textMuted mt-1.5">
                        <Mail size={15} />
                        <span className="text-[15px]">{user?.email}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-[11px] font-bold text-textMuted uppercase tracking-widest mb-2.5">Account ID</label>
                      <input 
                        type="text" 
                        value={user?.id} 
                        readOnly 
                        className="w-full bg-black/40 border border-white/5 rounded-xl px-5 py-3.5 text-textMuted text-[14px] font-mono outline-none cursor-default selection:bg-primary/30" 
                      />
                    </div>
                  </div>
                </div>

                {/* Sign Out Section */}
                <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-textMain">Sign Out</h3>
                    <p className="text-[13px] text-textMuted mt-1">Log out of your Orbstera account on this device.</p>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-red-500/10 text-textMain hover:text-red-500 border border-white/10 hover:border-red-500/20 rounded-xl font-bold text-[14px] transition-all active:scale-95"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'billing' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Current Plan Details */}
                <div className="bg-surface border border-borderSubtle rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
                  
                  <div className="flex items-start justify-between mb-8 relative z-10">
                    <div>
                      <h2 className="text-[11px] font-bold text-textMuted uppercase tracking-widest mb-2">Current Plan</h2>
                      <div className="flex items-center gap-3">
                        <h3 className="text-3xl font-black text-textMain tracking-tight">{planName}</h3>
                        {isPro && (
                          <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center gap-1.5">
                            <Crown size={12} className="text-amber-500" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/20 border border-white/5 rounded-xl p-6 relative z-10">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h4 className="font-bold text-textMain text-[15px]">Monthly Generations</h4>
                        <p className="text-[13px] text-textMuted mt-0.5">Your AI generation credits reset every month.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black text-white">{remaining}</span>
                        <span className="text-textMuted text-[13px] font-medium ml-1.5">left</span>
                      </div>
                    </div>
                    
                    <div className="w-full h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 relative overflow-hidden ${percentUsed > 90 ? 'bg-red-500' : 'bg-primary'}`} 
                        style={{ width: `${percentUsed}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg) translateX(-150%)' }} />
                      </div>
                    </div>
                    <div className="flex justify-between mt-3 text-[12px] font-medium">
                      <span className="text-textMuted">{used} used</span>
                      <span className="text-textMuted">{max} total</span>
                    </div>
                  </div>
                </div>

                {/* Upgrade Options */}
                {!isPro && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-surface border border-borderSubtle hover:border-primary/50 rounded-2xl p-6 transition-all group">
                      <h3 className="text-lg font-bold text-white mb-1">Student Pro</h3>
                      <p className="text-textMuted text-[13px] mb-6">Perfect for quick, watermarked-free exports.</p>
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl font-black text-white">$5</span>
                        <span className="text-textMuted text-sm">/mo</span>
                      </div>
                      <button 
                        onClick={() => handleUpgrade('student_pro')}
                        disabled={!!upgrading}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all text-[14px]"
                      >
                        {upgrading === 'student_pro' ? 'Loading...' : 'Upgrade to Student'}
                      </button>
                    </div>

                    <div className="bg-gradient-to-b from-primary/10 to-surface border border-primary/30 hover:border-primary rounded-2xl p-6 transition-all relative overflow-hidden group">
                      <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                        Best Value
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        Creator Pro <Crown size={16} className="text-amber-400" />
                      </h3>
                      <p className="text-primary/80 text-[13px] mb-6">DeepSeek R1 intelligence & 100 generations.</p>
                      <div className="flex items-baseline gap-1 mb-6">
                        <span className="text-3xl font-black text-white">$19</span>
                        <span className="text-textMuted text-sm">/mo</span>
                      </div>
                      <button 
                        onClick={() => handleUpgrade('creator_pro')}
                        disabled={!!upgrading}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all text-[14px] active:scale-95"
                      >
                        {upgrading === 'creator_pro' ? 'Loading...' : 'Upgrade to Creator Pro'}
                      </button>
                    </div>
                  </div>
                )}
                
                {profile?.plan === 'student_pro' && (
                  <div className="bg-gradient-to-b from-primary/10 to-surface border border-primary/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                        Upgrade to Creator Pro <Crown size={16} className="text-amber-400" />
                      </h3>
                      <p className="text-primary/80 text-[13px]">Unlock DeepSeek R1 and 100 monthly generations for $19/mo.</p>
                    </div>
                    <button 
                      onClick={() => handleUpgrade('creator_pro')}
                      disabled={!!upgrading}
                      className="shrink-0 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all text-[14px] active:scale-95"
                    >
                      {upgrading === 'creator_pro' ? 'Loading...' : 'Upgrade Now'}
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
