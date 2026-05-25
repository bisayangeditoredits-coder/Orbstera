"use client";

import { motion } from "framer-motion";
import { Download, Monitor } from "lucide-react";

const INSTALLER_URL = process.env.NEXT_PUBLIC_WINDOWS_DESKTOP_INSTALLER_URL?.trim() ?? "";

export function DesktopDownload() {
  const hasInstaller = INSTALLER_URL.length > 0;

  return (
    <section className="w-full relative overflow-hidden py-28 px-6 bg-[#050508] text-white border-y border-white/[0.06]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(59,130,246,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] via-transparent to-transparent h-32" />

      <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white/85 backdrop-blur-md"
        >
          <Monitor className="h-3.5 w-3.5 text-primary" aria-hidden />
          <span>Desktop App</span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4 font-space-grotesk text-4xl font-bold tracking-tight md:text-5xl"
        >
          Download Orbstera{" "}
          <span className="bg-gradient-to-r from-blue-400 via-primary to-indigo-400 bg-clip-text text-transparent">
            Desktop
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-2 max-w-xl text-lg text-white/55 md:text-xl"
        >
          Experience Orbstera as a full desktop application.
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="mb-10 text-sm font-medium tracking-wide text-white/40"
        >
          Available for Windows
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-5"
        >
          {hasInstaller ? (
            <a
              href={INSTALLER_URL}
              download
              className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-full border border-white/10 bg-gradient-to-r from-primary/90 via-blue-500 to-indigo-500 px-10 py-4 text-lg font-bold text-white shadow-[0_0_40px_-8px_rgba(59,130,246,0.7)] transition-transform duration-300 hover:scale-[1.03] hover:shadow-[0_0_56px_-6px_rgba(99,102,241,0.85)] active:scale-[0.98]"
            >
              <span className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-white/10" />
              <Download className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:-translate-y-0.5" aria-hidden />
              <span className="relative z-10 tracking-tight">Download for Windows</span>
            </a>
          ) : (
            <p className="max-w-md rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm font-medium leading-relaxed text-white/45">
              The Windows installer download will appear here once your team publishes the build and sets the public installer URL for this deployment.
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase tracking-widest text-white/35">
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/50">macOS — coming soon</span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-white/50">Linux — coming soon</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
