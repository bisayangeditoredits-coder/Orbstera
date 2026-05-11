"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SmoothScroll } from './SmoothScroll';
import { ensureLottiePlayerScript } from '@/lib/ensure-lottie-player';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  }));

  useEffect(() => {
    ensureLottiePlayerScript();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll />
      {children}
    </QueryClientProvider>
  );
}
