'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Footer } from '@/components/layout/Footer';
import { 
  Zap, Users, BarChart3, LayoutDashboard, 
  LineChart, PieChart, Activity, Quote
} from 'lucide-react';

export default function FeaturesPage() {
  return (
    <main className="min-h-screen w-full bg-white pt-24 font-sans text-slate-900 overflow-x-hidden">
      
      {/* 1. HERO SECTION: All the Essentials */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-16 text-center relative">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[url('https://kitpro.site/saasnova/wp-content/uploads/sites/443/2025/09/BG-Grid-4-800x569.jpeg')] opacity-5 bg-cover bg-center pointer-events-none" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 font-medium px-4 py-1.5 rounded-full text-sm mb-6 border border-blue-100 relative z-10"
        >
          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
          Features
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 relative z-10"
        >
          All the Essentials
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-500 max-w-2xl mx-auto relative z-10"
        >
          Discover powerful tools to streamline your presentation workflow and boost productivity.
        </motion.p>
      </section>

      {/* 2. SMARTER WORKFLOW, FASTER RESULTS */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 text-blue-500 font-semibold text-sm mb-4">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Advantage
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 max-w-md">
              Smarter Workflow,<br/>Faster Results
            </h2>
          </div>
          <p className="text-slate-500 max-w-sm mt-4 md:mt-0">
            Our platform gives you real-time control, flexibility, and the reliability you need to scale with confidence.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1 */}
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 flex flex-col items-start overflow-hidden relative group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 mb-6 shadow-sm">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">AI Automation</h3>
            <p className="text-slate-500 mb-8 max-w-sm">
              Automate repetitive formatting tasks and save hours of manual work.
            </p>
            {/* Mock Visual */}
            <div className="w-full h-48 bg-white rounded-t-xl border border-slate-200 mt-auto p-4 shadow-sm translate-y-4 group-hover:translate-y-0 transition-transform">
               <div className="w-3/4 h-4 bg-slate-100 rounded-md mb-3" />
               <div className="w-1/2 h-4 bg-slate-100 rounded-md" />
               <div className="absolute bottom-4 right-4 bg-blue-600 text-white font-bold text-xl px-4 py-2 rounded-lg shadow-lg rotate-[-5deg]">
                 80% Save time
               </div>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 flex flex-col items-start overflow-hidden relative group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 mb-6 shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Team Collaboration</h3>
            <p className="text-slate-500 mb-8 max-w-sm">
              Enable seamless communication and teamwork in one platform.
            </p>
            <div className="mt-auto">
              <button onClick={() => window.dispatchEvent(new Event('open-lead-modal'))} className="px-6 py-2 rounded-full border border-slate-200 bg-white text-slate-700 font-medium hover:border-blue-500 transition-colors">
                Get Started
              </button>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 flex flex-col items-start overflow-hidden relative group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 mb-6 shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Real-Time Analytics</h3>
            <p className="text-slate-500 mb-8 max-w-sm">
              Monitor team performance with an up to date dashboard.
            </p>
            {/* Mock Chart UI */}
            <div className="flex items-end gap-1.5 h-24 mt-auto opacity-70 group-hover:opacity-100 transition-opacity">
              {[40, 60, 45, 80, 50, 90, 70, 85, 60, 100, 75, 40, 80].map((h, i) => (
                <div key={i} className="w-3 sm:w-4 bg-blue-400 rounded-full" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-50 rounded-3xl p-10 border border-slate-100 flex flex-col items-start overflow-hidden relative group">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-blue-500 mb-6 shadow-sm">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4">Custom Dashboard</h3>
            <p className="text-slate-500 mb-8 max-w-sm">
              Customize the dashboard display according to your needs.
            </p>
            {/* Mock UI */}
            <div className="w-full h-32 bg-white rounded-t-xl border border-slate-200 mt-auto shadow-sm p-4 translate-y-4 group-hover:translate-y-0 transition-transform">
              <div className="flex gap-4 h-full">
                <div className="w-1/3 bg-slate-50 rounded-lg h-full" />
                <div className="w-2/3 bg-blue-500 rounded-lg h-full relative">
                  <div className="absolute -bottom-2 -right-2 bg-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                    Fix This
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. OUR CORE SERVICES */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-16 bg-slate-50 rounded-3xl w-[calc(100%-2rem)] md:w-[calc(100%-6rem)] xl:w-full my-12 border border-slate-100">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-blue-500 font-semibold text-sm mb-4">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Advantage
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Our Core Services</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Discover the powerful engines that drive Orbstera's capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Real-Time Dashboards", icon: LayoutDashboard },
            { title: "Predictive Analytics", icon: LineChart },
            { title: "Data Visualization", icon: PieChart },
            { title: "Reporting & Insights", icon: Activity }
          ].map((service, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 text-center shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-blue-500 mb-6">
                <service.icon className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{service.title}</h3>
              <p className="text-slate-500 text-sm">
                Empowering your team with the best tools available in the market.
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── TRUSTED BY MARQUEE ── */}
      <section className="py-20 border-y border-slate-100 overflow-hidden bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 mb-10 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Trusted by teams at world-class companies</p>
        </div>
        <div className="relative flex overflow-x-hidden">
          <div className="flex gap-16 animate-marquee whitespace-nowrap items-center py-4">
            {["Google", "Microsoft", "Stripe", "Shopify", "Airbnb", "Figma", "Notion", "Vercel", "Atlassian", "HubSpot"].map((name, i) => (
              <span key={i} className="text-2xl font-extrabold text-slate-200 tracking-tighter shrink-0 hover:text-slate-400 transition-colors cursor-default">{name}</span>
            ))}
          </div>
          <div className="flex gap-16 animate-marquee2 whitespace-nowrap items-center py-4 absolute top-0" aria-hidden>
            {["Google", "Microsoft", "Stripe", "Shopify", "Airbnb", "Figma", "Notion", "Vercel", "Atlassian", "HubSpot"].map((name, i) => (
              <span key={i} className="text-2xl font-extrabold text-slate-200 tracking-tighter shrink-0">{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#3B82F6] mb-4">Social Proof</p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E293B] tracking-tighter">What our users say</h2>
          </div>
          <p className="text-slate-400 text-sm max-w-xs">Join thousands of professionals who have already transformed how they present.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-slate-100">
          {[
            { quote: "Orbstera cut our deck prep time from 6 hours to under 20 minutes. Our investors noticed the quality immediately.", name: "Sarah Chen", role: "CEO, Nexaflow", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=100&q=80" },
            { quote: "I've tried every presentation tool on the market. Nothing comes close to the AI intelligence and design quality of Orbstera.", name: "Marcus Williams", role: "Head of Sales, Vertex Corp", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=100&q=80" },
            { quote: "Our board presentations have never looked more professional. Orbstera is now a non-negotiable part of our workflow.", name: "Elena Rodriguez", role: "CFO, Helix Ventures", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=100&q=80" },
          ].map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="border-b border-r border-slate-100 p-8 md:p-10 flex flex-col gap-6"
            >
              <Quote className="w-8 h-8 text-[#3B82F6]/30" />
              <p className="text-[#1E293B] font-medium leading-relaxed text-sm flex-1">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <img src={t.avatar} alt={t.name} className="w-10 h-10 object-cover shrink-0" />
                <div>
                  <p className="font-bold text-[#1E293B] text-sm">{t.name}</p>
                  <p className="text-slate-400 text-xs">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 4. CTA */}
      <section className="max-w-5xl mx-auto px-6 sm:px-12 py-16 mb-16">
        <div className="bg-gradient-to-br from-[#044D75] to-[#023B5A] rounded-[40px] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
           <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
           <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center mb-8 relative z-10 border border-blue-400/30">
             <Zap className="w-8 h-8 text-cyan-400" />
           </div>
           <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 relative z-10">
             Ready to Transform<br/>Your <span className="text-cyan-400 bg-white/10 px-2 rounded-lg">Workflow</span>
           </h2>
           <p className="text-blue-100 mb-10 relative z-10">
             Start your free trial today and see the difference with Orbstera.
           </p>
           <button onClick={() => window.dispatchEvent(new Event('open-lead-modal'))} className="bg-blue-500 text-white font-bold px-8 py-4 rounded-full hover:bg-blue-600 transition-colors shadow-lg relative z-10">
             Get Started
           </button>
        </div>
      </section>

      <Footer />
    </main>
  );
}
