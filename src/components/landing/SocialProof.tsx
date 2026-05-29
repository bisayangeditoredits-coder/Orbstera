"use client";

import { useEffect, useRef, useState } from "react";

// Parse a stat string into { prefix, number, suffix }
// e.g. "2M+" -> { prefix: "", number: 2, suffix: "M+" }
// e.g. "85%"  -> { prefix: "", number: 85, suffix: "%" }
// e.g. "4.9/5" -> { prefix: "", number: 4.9, suffix: "/5" }
// e.g. "10k+" -> { prefix: "", number: 10, suffix: "k+" }
function parseStat(value: string): { prefix: string; number: number; suffix: string; decimals: number } {
  const match = value.match(/^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/);
  if (!match) return { prefix: "", number: 0, suffix: value, decimals: 0 };
  const raw = match[2];
  const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
  return {
    prefix: match[1],
    number: parseFloat(raw),
    suffix: match[3],
    decimals,
  };
}

function useCountUp(target: number, decimals: number, duration = 1800, active: boolean) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    startRef.current = null;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active, target, duration, decimals]);

  return display;
}

function StatCard({ value, label, index }: { value: string; label: string; index: number }) {
  const { prefix, number, suffix, decimals } = parseStat(value);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const counted = useCountUp(number, decimals, 1800, visible);
  const displayValue = `${prefix}${decimals > 0 ? counted.toFixed(decimals) : Math.floor(counted)}${suffix}`;

  return (
    <div
      ref={ref}
      className="flex flex-col items-center text-center"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${index * 0.12}s, transform 0.6s ease ${index * 0.12}s`,
      }}
    >
      <div className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-primary tracking-tight mb-2 sm:mb-4">
        {displayValue}
      </div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
    </div>
  );
}

export function SocialProof() {
  const stats = [
    { value: "2M+", label: "Presentations Generated" },
    { value: "85%", label: "Less Time Spent" },
    { value: "10k+", label: "Active Teams" },
    { value: "4.9/5", label: "Average Rating" },
  ];

  return (
    <section className="w-full py-16 lg:py-24 bg-slate-50 flex flex-col items-center border-y border-slate-100">
      <div className="max-w-7xl w-full mx-auto px-6 sm:px-12">
        <p className="text-center text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest mb-12 sm:mb-16">
          Powering the world&apos;s most innovative presentations
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <StatCard key={i} value={stat.value} label={stat.label} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
