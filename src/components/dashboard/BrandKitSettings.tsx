'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Loader2, Palette, Type, Building2, Save, Crown, Lock } from 'lucide-react';
import { useCredits } from '@/hooks/useCredits';

export function BrandKitSettings() {
  const supabase = createClient();
  const credits = useCredits();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#473BF0');
  const [font, setFont] = useState('Modern');
  const [userId, setUserId] = useState<string | null>(null);

  const plan = credits.plan || 'free';
  const isPro = plan === 'creator_pro' || plan === 'student_pro' || plan === 'pro' || plan === 'admin';

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data } = await supabase
        .from('profiles')
        .select('brand_kit')
        .eq('id', user.id)
        .single();
      
      if (data?.brand_kit) {
        const kit = data.brand_kit as Record<string, string>;
        setBrandName(kit.name || '');
        setPrimaryColor(kit.primary_color || '#473BF0');
        setFont(kit.font || 'Modern');
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleSave = async () => {
    if (!userId || !isPro) return;
    setSaving(true);
    setSaveMessage('');
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          brand_kit: {
            name: brandName,
            primary_color: primaryColor,
            font: font
          }
        })
        .eq('id', userId);
        
      if (error) throw error;
      setSaveMessage('Saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (e) {
      console.error(e);
      setSaveMessage('Error saving brand kit.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/70 bg-white shadow-sm relative">
      {!isPro && (
        <div className="absolute inset-0 z-10 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-amber-100 flex flex-col items-center max-w-sm text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mb-4 border border-amber-100">
              <Lock className="text-amber-500" size={24} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Pro Feature</h3>
            <p className="text-slate-500 text-sm mb-6">Upgrade to Pro to unlock Global Brand Kits. Automatically style all AI generations with your custom colors, fonts, and company name.</p>
            <a href="/pricing" className="bg-amber-500 hover:bg-amber-400 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg shadow-amber-200 flex items-center gap-2">
              <Crown size={16} /> Upgrade Now
            </a>
          </div>
        </div>
      )}

      <div className="border-b border-slate-100 px-6 py-6 sm:px-8">
        <h3 className="text-lg font-semibold text-slate-900">Brand Kit</h3>
        <p className="mt-1 text-sm text-slate-500">
          Define your company brand. AI will automatically use this when generating new presentations.
        </p>
      </div>

      <div className="p-6 sm:p-8 space-y-6">
        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
            <Building2 size={16} className="text-primary" /> Company / Brand Name
          </label>
          <input 
            type="text" 
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            disabled={!isPro}
            placeholder="e.g. Acme Corp"
            className="w-full max-w-md px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none"
          />
        </div>

        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
            <Palette size={16} className="text-primary" /> Primary Brand Color
          </label>
          <div className="flex items-center gap-4 max-w-md">
            <input 
              type="color" 
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              disabled={!isPro}
              className="w-12 h-12 rounded-lg cursor-pointer border-none p-0 outline-none"
            />
            <input 
              type="text" 
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              disabled={!isPro}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-mono text-sm focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none"
            />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-700">
            <Type size={16} className="text-primary" /> Typography Style
          </label>
          <select
            value={font}
            onChange={(e) => setFont(e.target.value)}
            disabled={!isPro}
            className="w-full max-w-md px-4 py-3 rounded-xl border border-slate-200 bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition outline-none cursor-pointer"
          >
            <option value="Modern">Modern (Inter, Roboto)</option>
            <option value="Classic">Classic (Georgia, Times)</option>
            <option value="Playful">Playful (Comic, Rounded)</option>
            <option value="Minimal">Minimal (Helvetica, Arial)</option>
          </select>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || !isPro}
            className="bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Brand Kit'}
          </button>
          {saveMessage && (
            <span className="text-sm font-medium text-emerald-600 animate-in fade-in">{saveMessage}</span>
          )}
        </div>
      </div>
    </section>
  );
}
