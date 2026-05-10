"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { SmoothScroll } from './SmoothScroll';

const LOTTIE_SCRIPT_ID = 'lottie-player-script';

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
    if (document.getElementById(LOTTIE_SCRIPT_ID)) return;
    const script = document.createElement('script');
    script.id = LOTTIE_SCRIPT_ID;
    script.src = 'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SmoothScroll />
      {children}
    </QueryClientProvider>
  );
}
