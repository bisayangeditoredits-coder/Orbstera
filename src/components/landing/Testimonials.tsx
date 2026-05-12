"use client";

import { motion } from 'framer-motion';
import { BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

const REVIEWS = [
  {
    name: "Sarah Jenkins",
    handle: "@sarah_designs",
    role: "Creative Director",
    body: "It used to take me 6 hours to build a Series A deck. Now it takes 15 minutes, and the result looks like I hired a full design agency. Absolutely unreal.",
    rating: 5,
  },
  {
    name: "Michael Chen",
    handle: "@mchen_vc",
    role: "Partner at Nexus Capital",
    body: "I see hundreds of pitch decks a week. The ones made with Orbstera stand out immediately. The visual hierarchy and pacing are investor-grade out of the box.",
    rating: 5,
  },
  {
    name: "Elena Rodriguez",
    handle: "@elena_builds",
    role: "Startup Founder",
    body: "The ability to just type my raw, unstructured thoughts and watch the AI instantly weave them into a gorgeous, cinematic narrative is literally magic.",
    rating: 5,
  },
  {
    name: "James Kuroki",
    handle: "@james_k",
    role: "Marketing Director",
    body: "We replaced Gamma and Canva for our enterprise team. The export actually works perfectly, and the AI image generation is lightyears ahead of the competition.",
    rating: 5,
  },
  {
    name: "Amanda Patel",
    handle: "@amanda_pm",
    role: "Product Manager",
    body: "I pitched to a VC using an Orbstera deck on Monday. Got a term sheet by Thursday. The cinematic transitions alone won them over. Coincidence? I think not.",
    rating: 5,
  },
  {
    name: "David Smith",
    handle: "@dave_dev",
    role: "DevRel Lead",
    body: "Finally, an AI presentation tool that doesn't just vomit text onto a slide. It understands pacing, white space, and visual rhythm. 10/10.",
    rating: 5,
  },
  {
    name: "Lisa Wang",
    handle: "@lisaw_marketing",
    role: "Head of Growth",
    body: "The Generative Fill feature is insane. I had an image that didn't fit my slide, clicked one button, and it magically extended the background perfectly.",
    rating: 5,
  },
  {
    name: "Marcus Johnson",
    handle: "@marcus_j",
    role: "Sales Executive",
    body: "My close rate has gone up 40% since I started using Orbstera for my sales decks. It makes me look like I spent weeks preparing for a 30-minute call.",
    rating: 5,
  },
  {
    name: "Rachel Gomez",
    handle: "@rachel_g",
    role: "Agency Owner",
    body: "We now generate the first drafts of all client presentations in Orbstera. It has saved us thousands of dollars in design hours this month alone.",
    rating: 5,
  },
  {
    name: "Thomas Wright",
    handle: "@tw_designs",
    role: "Freelance Designer",
    body: "I was skeptical about AI replacing my presentation work. But Orbstera is a tool, not a replacement. It speeds up my workflow by 10x.",
    rating: 5,
  },
];

// Split reviews into 3 rows for the marquee
const ROW_1 = REVIEWS.slice(0, 4);
const ROW_2 = REVIEWS.slice(3, 7);
const ROW_3 = REVIEWS.slice(6, 10);

const ReviewCard = ({ review }: { review: typeof REVIEWS[0] }) => {
  return (
    <div className="relative group w-[350px] shrink-0 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md transition-all duration-300 hover:bg-white/[0.04] hover:border-primary/50 overflow-hidden">
      {/* Subtle hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
      
      <div className="flex items-center gap-4 mb-4">
        {/* Abstract Avatar */}
        <div className="w-12 h-12 rounded-full overflow-hidden border border-white/20 bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary),0.3)]">
          <span className="text-white font-bold text-lg">{review.name.charAt(0)}</span>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="text-white font-semibold text-sm">{review.name}</h4>
            <BadgeCheck className="w-4 h-4 text-primary" />
          </div>
          <div className="flex items-center justify-between mt-0.5">
            <span className="text-white/40 text-xs font-medium">{review.handle}</span>
            <span className="text-primary/80 text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">{review.role}</span>
          </div>
        </div>
      </div>

      {/* Stars */}
      <div className="flex gap-1 mb-3">
        {[...Array(review.rating)].map((_, i) => (
          <motion.svg 
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="w-4 h-4 text-yellow-500 fill-yellow-500 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]" 
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </motion.svg>
        ))}
      </div>

      <p className="text-white/70 text-sm leading-relaxed">
        "{review.body}"
      </p>
    </div>
  );
};

const MarqueeRow = ({ items, direction = "left", speed = 40 }: { items: typeof REVIEWS, direction?: "left" | "right", speed?: number }) => {
  return (
    <div className="flex w-full overflow-hidden group">
      <motion.div
        className="flex gap-6 pr-6 w-max"
        animate={{
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"],
        }}
        transition={{
          duration: speed,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        {/* Duplicate the items to create a seamless infinite loop */}
        {[...items, ...items, ...items].map((review, i) => (
          <ReviewCard key={i} review={review} />
        ))}
      </motion.div>
    </div>
  );
};

export function Testimonials() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section className="relative w-full py-32 overflow-hidden bg-[#010104]">
      {/* Background Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-primary/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      <div className="absolute top-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 mb-20 text-center flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary text-xs font-semibold uppercase tracking-widest mb-6"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Loved by Industry Leaders
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-space-grotesk font-bold text-white tracking-tight mb-6"
        >
          Don't just take our word for it.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-white/60 text-lg md:text-xl max-w-2xl text-balance"
        >
          Join thousands of founders, executives, and creators who have upgraded to cinematic, AI-powered storytelling.
        </motion.p>
      </div>

      {/* Infinite Scrolling Marquees */}
      <div className="relative z-10 flex flex-col gap-6 -mx-4 md:-mx-20 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <MarqueeRow items={ROW_1} direction="left" speed={60} />
        <MarqueeRow items={ROW_2} direction="right" speed={55} />
        <MarqueeRow items={ROW_3} direction="left" speed={65} />
      </div>

      <div className="absolute bottom-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </section>
  );
}
