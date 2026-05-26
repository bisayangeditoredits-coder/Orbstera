import { ArrowUpRight, Play } from 'lucide-react';
import Link from 'next/link';

const TUTORIALS = [
  {
    badge: 'BASICS',
    badgeColor: 'text-blue-700 bg-blue-100',
    title: 'Getting Started with Orbstera',
    desc: 'Learn the core mechanics of navigating the canvas, adding slides, and using the properties panel.',
  },
  {
    badge: 'AI MAGIC',
    badgeColor: 'text-purple-700 bg-purple-100',
    title: 'AI-Powered Slide Generation',
    desc: 'Automatically generate fully formatted presentations from a single text prompt using our advanced AI.',
  },
  {
    badge: 'DESIGN',
    badgeColor: 'text-emerald-700 bg-emerald-100',
    title: 'Advanced Typographic Layouts',
    desc: 'Master the art of creating editorial-grade text layouts with our premium font pairings.',
  },
  {
    badge: 'INTEGRATIONS',
    badgeColor: 'text-amber-700 bg-amber-100',
    title: 'Wikipedia Integration Walkthrough',
    desc: 'Fetch high-res images and premium fact summaries directly from Wikipedia into your slides.',
  },
  {
    badge: 'COLLABORATION',
    badgeColor: 'text-rose-700 bg-rose-100',
    title: 'Real-time Collaboration & Sharing',
    desc: 'Invite team members to edit simultaneously and share secure web links to your presentations.',
  },
  {
    badge: 'EXPORT',
    badgeColor: 'text-indigo-700 bg-indigo-100',
    title: 'Exporting to PDF & PPTX',
    desc: 'Learn how to perfectly preserve your custom fonts and layouts when exporting to legacy formats.',
  },
  {
    badge: 'DESIGN',
    badgeColor: 'text-emerald-700 bg-emerald-100',
    title: 'Using the Visual Gallery Layout',
    desc: 'Automatically create beautiful masonry photo collages from multiple images in one click.',
  },
  {
    badge: 'BASICS',
    badgeColor: 'text-blue-700 bg-blue-100',
    title: 'One-Click Restyling & Theming',
    desc: 'Instantly swap between dark mode, light mode, and custom brand palettes across your entire deck.',
  },
  {
    badge: 'ANIMATION',
    badgeColor: 'text-fuchsia-700 bg-fuchsia-100',
    title: 'Crafting Cinematic Animations',
    desc: 'Use our timeline and entrance effects to build buttery smooth, 60fps presentation transitions.',
  },
  {
    badge: 'USE CASE',
    badgeColor: 'text-slate-700 bg-slate-200',
    title: 'Pitch Deck Best Practices',
    desc: 'See how top founders use Orbstera to build billion-dollar pitch decks that convert.',
  },
  {
    badge: 'USE CASE',
    badgeColor: 'text-slate-700 bg-slate-200',
    title: 'Educational Presentations for Teachers',
    desc: 'Keep students engaged with interactive layouts and stunning visual media.',
  },
  {
    badge: 'USE CASE',
    badgeColor: 'text-slate-700 bg-slate-200',
    title: 'Generating Agency Portfolios',
    desc: 'Showcase your creative work in a gorgeous, web-native format that looks professional everywhere.',
  },
];

export default function LearnPage() {
  return (
    <main className="min-h-screen w-full bg-gradient-to-b from-[#EBF4FF] via-[#F4F9FF] to-white pb-24 pt-32 lg:pt-40">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-12 max-w-3xl">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Learn Orbstera
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Master the new medium for presenting ideas. Watch our tutorials to go from beginner to pro in minutes.
          </p>
        </div>

        {/* Video Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {TUTORIALS.map((tut, i) => (
            <Link 
              key={i} 
              href="#"
              className="group flex flex-col overflow-hidden rounded-2xl bg-white border border-slate-200/60 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-slate-300/80 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              {/* Full Bleed Video Thumbnail */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900 shrink-0">
                {/* Simulated video background */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-slate-900/40 to-slate-900/80 z-0 transition-opacity duration-300 group-hover:opacity-80" />
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-overlay transition-transform duration-700 ease-out group-hover:scale-105" />
                
                {/* Floating Badge (Glassmorphism) */}
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest backdrop-blur-md bg-white/10 text-white border border-white/20 shadow-sm">
                    {tut.badge}
                  </span>
                </div>

                {/* Play Button */}
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-md border border-white/30 transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30 group-hover:shadow-lg">
                    <Play className="ml-1 h-6 w-6 fill-white text-white" />
                  </div>
                </div>
                
                {/* Duration Tag */}
                <div className="absolute bottom-3 right-3 z-10">
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                    {Math.floor(Math.random() * 5 + 2)}:{String(Math.floor(Math.random() * 60)).padStart(2, '0')}
                  </span>
                </div>
              </div>
              
              {/* Content Area */}
              <div className="flex flex-col flex-grow p-5 sm:p-6">
                <h3 className="mb-2 text-[16px] font-semibold leading-snug text-slate-900 group-hover:text-primary transition-colors line-clamp-2">
                  {tut.title}
                </h3>
                <p className="mb-4 text-[13px] leading-relaxed text-slate-500 line-clamp-2 flex-grow">
                  {tut.desc}
                </p>
                <div className="mt-auto flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 transition-colors">
                  Watch tutorial
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
