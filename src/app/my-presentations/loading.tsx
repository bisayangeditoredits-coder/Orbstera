'use client';

export default function DashboardLoading() {
  return (
    <div className="flex min-h-dvh bg-[#F0F7FF] font-sans text-slate-900 overflow-hidden">
      {/* Background radial glow */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-10%,rgba(59,130,246,0.1),transparent)]"
        aria-hidden
      />

      {/* Sidebar Mock Skeleton */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/40 bg-gradient-to-b from-[#E8F2FF] to-[#D4E8FF] shadow-xl lg:flex lg:sticky lg:top-0 lg:h-dvh">
        <div className="flex min-h-0 flex-1 flex-col justify-between p-6 lg:p-8">
          <div>
            {/* Logo area */}
            <div className="mb-10 inline-flex items-center">
              <div className="h-9 w-32 bg-slate-300/40 rounded-xl animate-pulse" />
            </div>

            {/* Nav items skeleton */}
            <div className="space-y-4">
              <div className="px-4 py-1">
                <div className="h-3 w-10 bg-slate-300/40 rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-white/30 border-r-4 border-primary/20">
                  <div className="h-5 w-5 bg-slate-300/50 rounded-lg animate-pulse" />
                  <div className="h-4 w-20 bg-slate-300/50 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/10">
                  <div className="h-5 w-5 bg-slate-300/30 rounded-lg animate-pulse" />
                  <div className="h-4 w-16 bg-slate-300/30 rounded animate-pulse" />
                </div>
                <div className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/10">
                  <div className="h-5 w-5 bg-slate-300/30 rounded-lg animate-pulse" />
                  <div className="h-4 w-20 bg-slate-300/30 rounded animate-pulse" />
                </div>
              </div>
            </div>

            {/* Recent projects skeleton */}
            <div className="mt-10">
              <div className="mb-4 px-4">
                <div className="h-3 w-28 bg-slate-300/35 rounded animate-pulse" />
              </div>
              <div className="space-y-3 px-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-1">
                    <div className="h-2 w-2 rounded-full bg-slate-300/40 animate-pulse" />
                    <div className="h-3 w-24 bg-slate-300/40 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom user profile card skeleton */}
          <div className="border-t border-white/40 pt-4 lg:pt-6">
            <div className="flex w-full items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-4 shadow-sm">
              <div className="h-10 w-10 shrink-0 rounded-full bg-slate-300/50 animate-pulse border-2 border-white" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-4 w-24 bg-slate-300/50 rounded animate-pulse" />
                <div className="h-3 w-16 bg-slate-300/40 rounded animate-pulse" />
              </div>
              <div className="h-4 w-4 bg-slate-300/30 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Header Mock Skeleton */}
        <header className="sticky top-0 z-20 flex shrink-0 flex-col gap-3 border-b border-white/50 bg-[#F0F7FF]/80 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* Mobile menu trigger */}
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white/80 shadow-sm lg:hidden">
              <div className="h-5 w-5 bg-slate-300/40 rounded animate-pulse" />
            </div>

            {/* Mobile title */}
            <div className="min-w-0 lg:hidden space-y-1">
              <div className="h-3 w-12 bg-slate-300/30 rounded animate-pulse" />
              <div className="h-5 w-24 bg-slate-300/40 rounded animate-pulse" />
            </div>

            {/* Search Input Skeleton */}
            <div className="relative hidden min-w-0 flex-1 sm:block sm:max-w-md">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 bg-slate-300/40 rounded animate-pulse" />
              <div className="w-full h-11 rounded-2xl bg-white/90 border border-transparent py-3 pl-12 pr-4 shadow-sm" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 sm:gap-4">
            {/* New Deck Button Skeleton */}
            <div className="h-11 w-28 sm:w-36 bg-slate-300/40 rounded-xl animate-pulse shadow-lg" />
            {/* Pricing Button Skeleton */}
            <div className="hidden h-11 w-20 bg-white/90 border border-white/80 rounded-xl animate-pulse shadow-sm lg:block" />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 pb-12 pt-8 sm:px-8 sm:pb-16 space-y-10">
          {/* Dashboard Welcome & Stats Mock */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-slate-300/45 rounded-xl animate-pulse" />
              <div className="h-4 w-64 bg-slate-300/35 rounded-lg animate-pulse" />
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl border border-white/50 bg-white/60 p-6 shadow-sm flex items-center justify-between">
                  <div className="space-y-3">
                    <div className="h-3 w-20 bg-slate-300/35 rounded animate-pulse" />
                    <div className="h-8 w-16 bg-slate-300/45 rounded-lg animate-pulse" />
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-slate-300/30 animate-pulse" />
                </div>
              ))}
            </div>
          </div>

          {/* Deck Library Skeleton Section */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="h-6 w-32 bg-slate-300/40 rounded-lg animate-pulse" />
              <div className="h-4 w-20 bg-slate-300/30 rounded animate-pulse" />
            </div>

            {/* Slide Grid skeleton */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="group overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-3 shadow-sm hover:shadow-md transition-all flex flex-col gap-3">
                  {/* Card Thumbnail Mock - Premium Blue Glassmorphism */}
                  <div className="aspect-[16/9] w-full rounded-2xl border border-primary/10 bg-primary/[0.03] backdrop-blur-sm animate-pulse relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-white/10 to-transparent pointer-events-none" />
                    <div className="h-10 w-10 rounded-full border border-primary/20 bg-primary/5 flex items-center justify-center relative">
                      <div className="h-3.5 w-3.5 rounded-full bg-primary/25 animate-ping absolute" />
                      <div className="h-2 w-2 rounded-full bg-primary/40" />
                    </div>
                  </div>
                  {/* Card Meta Mock */}
                  <div className="px-1 py-1 space-y-2">
                    <div className="h-4 w-3/4 bg-slate-300/40 rounded animate-pulse" />
                    <div className="flex justify-between items-center">
                      <div className="h-3 w-16 bg-slate-300/30 rounded animate-pulse" />
                      <div className="h-3 w-8 bg-slate-300/30 rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
