'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function AccountRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const payment = searchParams.get('payment');
    const target =
      payment === 'success'
        ? '/my-presentations?payment=success#settings'
        : '/my-presentations';
    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#F0F7FF]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="text-sm font-medium text-slate-500">Opening dashboard…</p>
      </div>
    </div>
  );
}

/** Legacy route — account & usage live on the dashboard. */
export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-[#F0F7FF]">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      }
    >
      <AccountRedirect />
    </Suspense>
  );
}
