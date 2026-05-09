'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { User, Mail, CreditCard, Shield, LogOut, Crown } from 'lucide-react';
import { motion } from 'framer-motion';
import { PayPalCheckoutButton } from '@/components/checkout/PayPalCheckoutButton';

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showPayPal, setShowPayPal] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const isPro = profile?.plan?.toLowerCase() === 'pro';

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setUser(user);
        
        // Fetch real-time profile from public.profiles table
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (profileData) {
          setProfile(profileData);
        }
      }
      setLoading(false);
    };
    getUser();
  }, [supabase, router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="max-w-4xl mx-auto pt-32 px-6 pb-20">
        <div className="mb-10">
          <h1 className="text-3xl font-space-grotesk font-bold text-textMain">Account Settings</h1>
          <p className="text-textMuted mt-2">Manage your creator profile and billing preferences.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-10">
          {/* Navigation Sidebar */}
          <div className="space-y-2">
            <button className="flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-primary font-medium transition-colors">
              <User size={18} /> Profile
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-textMuted hover:text-textMain rounded-xl transition-colors">
              <CreditCard size={18} /> Billing & Plan
            </button>
            <button className="flex items-center gap-3 w-full px-4 py-3 hover:bg-white/5 text-textMuted hover:text-textMain rounded-xl transition-colors">
              <Shield size={18} /> Security
            </button>
          </div>

          {/* Settings Content */}
          <div className="space-y-8">
            {/* Profile Card */}
            <section className="glass-panel border border-white/10 rounded-2xl p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-500" />
              <h2 className="text-lg font-bold text-textMain mb-6">Profile Details</h2>
              
              <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 p-1">
                  <div className="w-full h-full rounded-full bg-surface flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-2xl font-bold text-textMain uppercase">{user?.email?.[0]}</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-textMain">{user?.user_metadata?.full_name || 'Creator'}</h3>
                  <div className="flex items-center gap-2 text-textMuted mt-1">
                    <Mail size={14} />
                    <span className="text-sm">{user?.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-textMuted uppercase tracking-wider mb-2">Account ID</label>
                  <input 
                    type="text" 
                    value={user?.id} 
                    disabled 
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 text-textMuted text-sm outline-none cursor-not-allowed" 
                  />
                </div>
              </div>
            </section>

            {/* Plan Card */}
            <section className="glass-panel border border-white/10 rounded-2xl p-8 shadow-xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-textMain">Subscription Plan</h2>
                  <p className="text-sm text-textMuted mt-1">You are currently on the {isPro ? 'Pro' : 'Free'} plan.</p>
                </div>
                <div className="px-3 py-1 bg-white/10 border border-white/20 rounded-full flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full animate-pulse ${isPro ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <span className={`text-xs font-bold uppercase tracking-wider ${isPro ? 'text-amber-500' : 'text-white'}`}>
                    {isPro ? 'Pro' : 'Free'}
                  </span>
                </div>
              </div>

              {(() => {
                const used = profile?.generations_used || 0;
                const max = isPro ? 50 : 3;
                const remaining = Math.max(0, max - used);
                const percentUsed = Math.min(100, Math.round((used / max) * 100));

                return (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-bold text-primary mb-1">Generations Left</h4>
                        <p className="text-xs text-textMuted">You have {remaining} AI generations remaining this month.</p>
                      </div>
                      <div className="text-3xl font-black text-primary">{remaining}</div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${percentUsed > 80 ? 'bg-red-500' : 'bg-primary'}`} 
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-textMuted mt-2 text-right uppercase tracking-wider font-bold">
                      {used} / {max} Used
                    </p>
                  </div>
                );
              })()}

              {isPro ? (
                <div className="w-full py-3 bg-white/5 border border-amber-500/30 text-amber-500 font-bold rounded-xl flex items-center justify-center gap-2 cursor-default">
                  <Crown size={18} />
                  You are a Pro Member
                </div>
              ) : (
                showPayPal ? (
                  <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl relative">
                    <button onClick={() => setShowPayPal(false)} className="absolute top-2 right-2 text-textMuted hover:text-white text-xs">Cancel</button>
                    <p className="text-sm font-bold text-center mb-4">Complete your upgrade ($19.00)</p>
                    <PayPalCheckoutButton planId="Pro" price="19.00" />
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowPayPal(true)}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
                  >
                    <Crown size={18} className="text-amber-500" />
                    Upgrade to Pro ($19.00)
                  </button>
                )
              )}
            </section>

            {/* Danger Zone */}
            <section className="border border-red-500/20 rounded-2xl p-8 bg-red-500/5">
              <h2 className="text-lg font-bold text-red-500 mb-2">Danger Zone</h2>
              <p className="text-sm text-red-400/80 mb-6">Irreversible actions for your account.</p>
              
              <div className="flex items-center justify-between">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-6 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg font-semibold transition-colors"
                >
                  <LogOut size={16} /> Sign Out
                </button>
                <button className="text-sm font-semibold text-textMuted hover:text-red-500 transition-colors">
                  Delete Account
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
