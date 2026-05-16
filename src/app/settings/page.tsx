'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Legacy route — settings live on the dashboard. */
export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/my-presentations#settings');
  }, [router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F0F7FF]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="text-sm font-medium text-slate-500">Opening settings…</p>
      </div>
    </div>
  );
}
