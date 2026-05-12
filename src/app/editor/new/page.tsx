import { Suspense } from 'react';
import NewDocumentClient from './NewDocumentClient';

function NewDocFallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#F4F6FA] text-neutral-500">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-full border-2 border-primary/25 border-t-primary animate-spin" />
        <p className="text-sm font-medium">Preparing new document…</p>
      </div>
    </div>
  );
}

export default function NewDocumentPage() {
  return (
    <Suspense fallback={<NewDocFallback />}>
      <NewDocumentClient />
    </Suspense>
  );
}
