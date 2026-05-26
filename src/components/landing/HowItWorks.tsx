import { Sparkles, Wand2, Download } from 'lucide-react';

const steps = [
  {
    id: 1,
    title: 'Start with a Prompt',
    description: 'Type your topic or paste your outline. Our AI understands your intent and structure instantly.',
    icon: Sparkles,
  },
  {
    id: 2,
    title: 'Let AI Build It',
    description: 'Orbstera automatically writes the content, sources high-quality images, and applies a beautiful layout.',
    icon: Wand2,
  },
  {
    id: 3,
    title: 'Export & Present',
    description: 'Edit if needed, then present directly from the browser or export to PowerPoint (.pptx) with one click.',
    icon: Download,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="w-full bg-white py-24 sm:py-32 relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-16 sm:mb-24">
          <h2 className="text-base font-semibold leading-7 text-primary">Simple Workflow</h2>
          <p className="mt-2 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
            How Orbstera Works
          </p>
          <p className="mt-6 text-lg leading-8 text-slate-600 font-medium">
            Go from a blank page to a stunning presentation in seconds, not hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8 relative">
          {/* Connector Line (Desktop only) */}
          <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          {steps.map((step) => (
            <div key={step.id} className="relative flex flex-col items-center text-center group">
              <div className="w-24 h-24 rounded-3xl bg-[#FAFAFA] border border-black/[0.04] flex items-center justify-center mb-8 relative z-10 shadow-sm transition-transform duration-300 group-hover:-translate-y-2 group-hover:shadow-md">
                <div className="absolute inset-0 bg-primary/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <step.icon className="w-10 h-10 text-slate-700 group-hover:text-primary transition-colors" strokeWidth={1.5} />
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md">
                  {step.id}
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
              <p className="text-slate-500 font-medium leading-relaxed px-4">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
