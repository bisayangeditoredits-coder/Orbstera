import { Suspense } from 'react';
import EditorClient from './EditorClient';

// This server component wraps the client editor in a Suspense boundary,
// satisfying Next.js's requirement for useSearchParams() in static builds.
export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-textMuted text-sm">Loading Editor...</p>
        </div>
      </div>
    }>
      <EditorClient />
    </Suspense>
  );
}
