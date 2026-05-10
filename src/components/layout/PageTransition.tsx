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
    const timer = setTimeout(() => setIsLoading(false), 280);
    return () => clearTimeout(timer);
  }, [pathname, reduceMotion]);

  return (
    <>
      <AnimatePresence>
        {isLoading && !reduceMotion && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0.85 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: '0 50%' }}
            className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-purple-500 to-blue-400 z-[9999] shadow-[0_0_12px_rgba(59,130,246,0.35)]"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0.98, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0.98, y: -2 }}
          transition={{ duration: reduceMotion ? 0 : 0.16, ease: [0.22, 1, 0.36, 1] }}
          className="flex min-h-dvh flex-col"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
