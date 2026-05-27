import { MarketingPageLayout } from '@/components/layout/MarketingPageLayout';

export default function RoadmapPage() {
  return (
    <MarketingPageLayout
      title="Roadmap"
      description="A transparent view of what we&apos;re building next."
    >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <section className="rounded-2xl border border-black/[0.06] bg-white px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Shipped ✓</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>AI Generation</li>
              <li>PPTX Export</li>
              <li>Voice Input</li>
              <li>Generative Fill</li>
              <li>Real-time Collaboration</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-black/[0.06] bg-white px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">In Progress ⟳</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Mobile Editor</li>
              <li>Template Library</li>
              <li>Team Workspaces</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-black/[0.06] bg-white px-6 py-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Planned ○</h2>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>Presentation Analytics</li>
              <li>Custom Domain Sharing</li>
              <li>API Access</li>
              <li>Zapier Integration</li>
            </ul>
          </section>
        </div>
    </MarketingPageLayout>
  );
}

