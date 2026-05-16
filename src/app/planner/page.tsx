'use client';

import { Suspense } from 'react';
import { PlannerShell } from '@/components/planner/PlannerShell';

function PlannerLoading() {
  return (
    <div className="flex h-dvh items-center justify-center bg-[#F0F7FF]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        <p className="text-sm font-medium text-slate-500">Loading Copilot…</p>
      </div>
    </div>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={<PlannerLoading />}>
      <PlannerShell />
    </Suspense>
  );
}
