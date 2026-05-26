import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Metadata } from 'next';
import { Sparkles, Zap, Bug, Palette } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Changelog - Orbstera AI',
  description: 'See the latest updates, features, and improvements to Orbstera.',
};

const updates = [
  {
    date: 'May 2026',
    version: 'v0.9.5',
    title: 'Performance Leap & Scalability Update',
    description: 'We rebuilt the core editor engine to be lightning fast, even on older laptops. Say goodbye to UI lag when editing large presentations.',
    changes: [
      { type: 'feature', icon: Zap, text: 'Granular rendering engine: 10x faster typing and dragging on old computers.' },
      { type: 'fix', icon: Bug, text: 'Eliminated background memory leaks during AI slide generation.' },
      { type: 'feature', icon: Sparkles, text: 'Preparation for 50,000+ daily active users infrastructure scale-up.' },
    ]
  },
  {
    date: 'April 2026',
    version: 'v0.9.0',
    title: 'Advanced AI Formatting',
    description: 'Our AI now automatically applies beautiful layouts and handles complex data like charts and tables.',
    changes: [
      { type: 'feature', icon: Sparkles, text: 'Smart Layout Engine automatically aligns text and images.' },
      { type: 'feature', icon: Palette, text: 'Brand new premium templates added to the library.' },
    ]
  },
  {
    date: 'March 2026',
    version: 'v0.8.0',
    title: 'PPTX Export 2.0',
    description: 'Major improvements to our PowerPoint export pipeline.',
    changes: [
      { type: 'feature', icon: Zap, text: 'Native .pptx export now preserves vector shapes and brand fonts.' },
      { type: 'fix', icon: Bug, text: 'Fixed issue where large background images failed to export.' },
    ]
  }
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-primary/20 selection:text-primary flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          
          <div className="mb-20 space-y-4">
            <p className="text-primary font-bold tracking-widest uppercase text-sm">Product Updates</p>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900">
              Changelog
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 font-medium max-w-xl">
              New updates and improvements to Orbstera. We ship fast to give you the best experience.
            </p>
          </div>

          <div className="space-y-16 sm:space-y-24 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {updates.map((update, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                
                {/* Timeline dot */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-white bg-slate-200 group-hover:bg-primary text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-300 relative z-10 ml-0 md:ml-0" />
                
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-6 sm:p-8 rounded-3xl bg-[#FAFAFA] border border-black/[0.04] shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-white border border-black/[0.06] rounded-full text-xs font-bold text-slate-700">
                      {update.version}
                    </span>
                    <span className="text-sm font-medium text-slate-400">{update.date}</span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">{update.title}</h3>
                  <p className="text-slate-600 mb-6 font-medium leading-relaxed">
                    {update.description}
                  </p>
                  
                  <ul className="space-y-4">
                    {update.changes.map((change, j) => (
                      <li key={j} className="flex gap-3 items-start">
                        <change.icon className={`w-5 h-5 shrink-0 mt-0.5 ${change.type === 'fix' ? 'text-orange-500' : 'text-primary'}`} />
                        <span className="text-sm font-medium text-slate-700">{change.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            ))}
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}
