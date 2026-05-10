'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (reduceMotion) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 320);
    return () => clearTimeout(timer);
  }, [pathname, reduceMotion]);

  return (
    <>
      <AnimatePresence>
        {isLoading && !reduceMotion && (
          <motion.div
            initial={{ width: '0%', opacity: 0.9 }}
            animate={{ width: '100%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ width: { duration: 0.35, ease: [0.22, 1, 0.36, 1] }, opacity: { duration: 0.15 } }}
            className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-primary via-purple-500 to-blue-400 z-[9999] shadow-[0_0_12px_rgba(59,130,246,0.35)] origin-left"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 flex flex-col min-h-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>

      {!reduceMotion && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="fixed inset-0 bg-white z-[10000] pointer-events-none"
        />
      )}
    </>
  );
}
