'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Users, Crown, Shield, Activity, Search, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function AdminDashboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (data.users) {
        const sorted = data.users.sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setUsers(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch admin users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push('/login');
        return;
      }
      fetchUsers();
    };
    checkAuth();
  }, [router]);

  const toggleUserPlan = async (userId: string, currentPlan: string) => {
    setUpdatingId(userId);
    const newPlan = currentPlan === 'pro' ? 'free' : 'pro';
    try {
      const res = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId, newPlan })
      });
      if (res.ok) {
        await fetchUsers(); // Refresh the list automatically
      }
    } catch (err) {
      console.error('Update failed', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPro = users.filter(u => u.user_metadata?.plan === 'pro').length;
  const totalGenerations = users.reduce((acc, u) => acc + (u.user_metadata?.generations_used || 0), 0);
  const totalRevenue = totalPro * 19; 

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 font-sans selection:bg-primary/30">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto pt-32 px-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500">Live Production Server</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-space-grotesk font-black tracking-tight flex items-center gap-4">
              SaaS Command Center
              <Shield className="text-primary opacity-50" size={32} />
            </h1>
            <p className="text-white/40 mt-3 text-lg max-w-xl">
              Monitor growth, orchestrate user plans, and manage your billion-dollar empire.
            </p>
          </div>
          
          <div className="px-6 py-4 bg-gradient-to-br from-primary/10 to-purple-500/10 border border-primary/20 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
              <Sparkles className="text-primary" size={24} />
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1">Monthly MRR</p>
              <p className="text-2xl font-black text-white">${totalRevenue}<span className="text-white/30 text-sm">/mo</span></p>
            </div>
          </div>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard title="Total Registered Users" value={users.length} icon={Users} color="text-blue-400" bg="bg-blue-500/10" trend="+12% this week" />
          <StatCard title="Active Pro Subscribers" value={totalPro} icon={Crown} color="text-amber-400" bg="bg-amber-500/10" trend="High retention" />
          <StatCard title="Total AI Slides Generated" value={totalGenerations} icon={Activity} color="text-emerald-400" bg="bg-emerald-500/10" trend="Cost effective" />
        </div>

        {/* Users Table */}
        <div className="bg-[#0A0A0A] border border-white/10 rounded-[24px] overflow-hidden shadow-2xl relative">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50" />
          
          <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white tracking-wide">Customer Database</h2>
            <div className="relative w-full md:w-auto">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
              <input 
                type="text" 
                placeholder="Search by email..." 
                className="w-full md:w-80 pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white outline-none focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-white/20"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] text-[11px] uppercase tracking-[0.1em] text-white/40 border-b border-white/5">
                  <th className="px-8 py-5 font-semibold">Creator Account</th>
                  <th className="px-8 py-5 font-semibold">Subscription Status</th>
                  <th className="px-8 py-5 font-semibold">AI Token Usage</th>
                  <th className="px-8 py-5 font-semibold">Joined Date</th>
                  <th className="px-8 py-5 font-semibold text-right">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence>
                  {users.map((u) => {
                    const plan = u.user_metadata?.plan || 'free';
                    const isPro = plan === 'pro';
                    const used = u.user_metadata?.generations_used || 0;
                    const date = new Date(u.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                    const isUpdating = updatingId === u.id;
                    
                    return (
                      <motion.tr 
                        key={u.id} 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className={`transition-all duration-300 ${isPro ? 'bg-amber-500/[0.02] hover:bg-amber-500/[0.05]' : 'hover:bg-white/[0.02]'}`}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${isPro ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 text-white'}`}>
                              {u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-semibold text-white block">{u.email}</span>
                              <span className="text-[10px] text-white/30 font-mono mt-1 block">ID: {u.id.substring(0, 12)}...</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {isPro ? (
                            <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[11px] font-bold flex items-center gap-2 w-max shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                              <Crown size={12} className="drop-shadow-lg" /> PRO TIER
                            </span>
                          ) : (
                            <span className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[11px] font-bold w-max block">
                              FREE TIER
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3 max-w-[150px]">
                            <div className="flex-1 h-1.5 bg-black/50 rounded-full overflow-hidden border border-white/5">
                              <div 
                                className={`h-full rounded-full ${isPro ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 'bg-gradient-to-r from-primary to-blue-400'}`} 
                                style={{ width: `${Math.min(100, (used / (isPro ? 50 : 3)) * 100)}%` }}
                              />
                            </div>
                            <span className={`text-[11px] font-mono font-bold ${used >= (isPro ? 50 : 3) ? 'text-red-400' : 'text-white/50'}`}>
                              {used}/{isPro ? 50 : 3}
                            </span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm text-white/40">{date}</td>
                        <td className="px-8 py-6 text-right">
                          {isPro ? (
                            <button 
                              onClick={() => toggleUserPlan(u.id, plan)}
                              disabled={isUpdating}
                              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ml-auto"
                            >
                              {isUpdating ? <span className="animate-pulse">Updating...</span> : <><ArrowDownRight size={14} /> Revoke Pro</>}
                            </button>
                          ) : (
                            <button 
                              onClick={() => toggleUserPlan(u.id, plan)}
                              disabled={isUpdating}
                              className="px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 ml-auto shadow-[0_0_10px_rgba(16,185,129,0.1)] hover:shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                            >
                              {isUpdating ? <span className="animate-pulse">Updating...</span> : <><ArrowUpRight size={14} /> Grant Pro</>}
                            </button>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
            
            {users.length === 0 && (
              <div className="p-20 text-center text-white/30 text-sm">
                No users found in the database. Share your landing page to get started!
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, trend }: any) {
  return (
    <div className="bg-[#0A0A0A] border border-white/10 p-8 rounded-[24px] flex flex-col justify-between relative overflow-hidden group hover:border-white/20 transition-colors shadow-xl">
      <div className={`absolute -right-10 -top-10 w-40 h-40 ${bg} rounded-full blur-3xl opacity-30 group-hover:opacity-60 transition-opacity duration-700`} />
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`w-14 h-14 rounded-2xl ${bg} flex items-center justify-center shrink-0 border border-white/5`}>
          <Icon className={color} size={28} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/30 bg-white/5 px-3 py-1 rounded-full border border-white/5">
          {trend}
        </span>
      </div>
      <div className="relative z-10">
        <p className="text-5xl font-space-grotesk font-black text-white mb-2">{value}</p>
        <p className="text-sm font-semibold text-white/40 tracking-wide">{title}</p>
      </div>
    </div>
  );
}
