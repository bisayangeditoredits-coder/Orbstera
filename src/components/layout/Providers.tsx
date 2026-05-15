"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SmoothScroll } from './SmoothScroll';
import { ensureLottiePlayerScript } from '@/lib/ensure-lottie-player';
import { SessionGuard } from '@/components/auth/SessionGuard';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  useEffect(() => {
    ensureLottiePlayerScript();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionGuard>
        <SmoothScroll />
        {children}
      </SessionGuard>
    </QueryClientProvider>
  );
}
