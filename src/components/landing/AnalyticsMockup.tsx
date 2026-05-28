"use client";


import { BarChart3, Users, Clock, ArrowUpRight } from 'lucide-react';

export function AnalyticsMockup() {
  return (
    <section className="w-full bg-[#FAFAFA] py-24 sm:py-32 border-b border-black/[0.04]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        <div className="flex flex-col md:flex-row-reverse items-center gap-16 lg:gap-24">
          
          {/* Text Content */}
          <div className="w-full md:w-5/12 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-6 w-max">
              <BarChart3 size={14} />
              Built-in Analytics
            </div>
            
            <h2 className="text-4xl sm:text-5xl font-semibold tracking-tight text-slate-900 mb-6 leading-[1.1]">
              Share with a link. <br className="hidden lg:block" />
              Measure engagement.
            </h2>
            
            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-8 max-w-lg">
              No more wondering if your pitch deck was actually read. Share your presentation instantly via a secure web link, and get deep insights into who viewed it, which slides they focused on, and when they dropped off.
            </p>

            <ul className="space-y-4 mb-10">
              {['Live view notifications', 'Slide-by-slide drop-off rates', 'Average time spent per slide'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Mockup Area */}
          <div className="w-full md:w-7/12">
            <div className="relative w-full aspect-[4/3] rounded-[2rem] bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col overflow-hidden">
              
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Q3 Investor Update</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Shared 2 days ago</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    Live
                  </div>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div 
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
                >
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-2">
                    <Users size={16} /> Total Views
                  </div>
                  <div className="text-3xl font-semibold text-slate-900">1,248</div>
                  <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold mt-2">
                    <ArrowUpRight size={14} /> +12% this week
                  </div>
                </div>
                
                <div 
                  className="bg-slate-50 p-4 rounded-2xl border border-slate-100"
                >
                  <div className="flex items-center gap-2 text-slate-500 text-sm font-semibold mb-2">
                    <Clock size={16} /> Avg. Completion
                  </div>
                  <div className="text-3xl font-semibold text-slate-900">84%</div>
                  <div className="flex items-center gap-1 text-indigo-600 text-xs font-bold mt-2">
                    <ArrowUpRight size={14} /> Top performing
                  </div>
                </div>
              </div>

              {/* Chart Mockup */}
              <div className="flex-1 flex flex-col justify-end">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Views by slide</div>
                <div className="flex items-end gap-2 h-32">
                  {[100, 95, 92, 85, 80, 75, 78, 65, 60, 55, 58, 50].map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-gradient-to-t from-indigo-200 to-indigo-400 rounded-t-sm"
                    />
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
