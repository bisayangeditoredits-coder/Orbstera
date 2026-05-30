import Link from 'next/link';
import { Footer } from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ - Orbstera AI',
  description: 'Frequently asked questions about Orbstera AI presentation maker.',
};

const faqs = [
  {
    q: "Is Orbstera free to use?",
    a: "Yes! Orbstera offers a free tier that allows you to generate presentations with AI, use our premium templates, and share links. Exporting without watermarks requires a one-time purchase or a subscription."
  },
  {
    q: "Can I export my presentations to PowerPoint (.pptx)?",
    a: "Absolutely. You can export any presentation to a fully editable .pptx file, preserving layouts and text so you can open it in Microsoft PowerPoint, Google Slides, or Keynote."
  },
  {
    q: "How does the AI generation work?",
    a: "We use advanced large language models to structure your topic, generate relevant speaker notes, and compose slide content. Our layout engine then automatically arranges the text and selects beautiful stock imagery or generates custom images based on your prompts."
  },
  {
    q: "Can I use my own images?",
    a: "Yes! You can drag and drop your own images directly onto the canvas, or use the 'Photos' panel to search Unsplash for high-quality stock photography."
  },
  {
    q: "Do I need to install anything?",
    a: "No installation is required. Orbstera runs entirely in your browser. Just sign in and start creating!"
  }
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-white selection:bg-primary/20 selection:text-primary flex flex-col">
      <main className="flex-1 pt-10 sm:pt-14 pb-24 px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          
          <div className="mb-16 text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              Frequently Asked Questions
            </h1>
            <p className="text-lg text-slate-500 font-medium">
              Everything you need to know about Orbstera.
            </p>
          </div>

          <div className="space-y-8">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-[#FAFAFA] rounded-3xl p-8 sm:p-10 border border-black/[0.04]">
                <h3 className="text-xl font-bold text-slate-900 mb-4">{faq.q}</h3>
                <p className="text-slate-600 leading-relaxed font-medium">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-24 text-center bg-gradient-to-br from-indigo-50 to-blue-50 rounded-3xl p-12 border border-indigo-100">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Still have questions?</h2>
            <p className="text-slate-600 mb-8 font-medium">
              Can&apos;t find the answer you&apos;re looking for? Please chat to our friendly team.
            </p>
            <Link 
              href="/contact"
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-8 text-sm font-bold text-white shadow-lg shadow-black/10 transition-transform hover:scale-105 active:scale-95"
            >
              Contact Support
            </Link>
          </div>
          
        </div>
      </main>

      <Footer />
    </div>
  );
}
