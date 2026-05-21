'use client';

import { useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isAppRoute } from '@/lib/route-performance';
import { cn } from '@/lib/cn';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const appSurface = isAppRoute(pathname);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (reduceMotion || appSurface) return;
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 220);
    return () => clearTimeout(timer);
  }, [pathname, reduceMotion, appSurface]);

  if (appSurface || reduceMotion) {
    return <div className="flex min-h-dvh flex-col">{children}</div>;
  }

  return (
    <>
      {isLoading && (
        <div
          className="fixed top-0 left-0 right-0 z-[9999] h-[2px] origin-left bg-primary animate-[page-progress_0.22s_ease-out_forwards]"
          aria-hidden
        />
      )}
      <div
        key={pathname}
        className={cn(
          'flex min-h-dvh flex-col',
          'animate-[page-fade-in_0.14s_ease-out]',
        )}
      >
        {children}
      </div>
    </>
  );
}
