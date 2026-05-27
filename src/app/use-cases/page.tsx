import Link from 'next/link';
import type { ComponentType } from 'react';
import { Users, BookOpen, Briefcase, Megaphone } from 'lucide-react';
import { MarketingPageLayout } from '@/components/layout/MarketingPageLayout';

type IconComponent = ComponentType<any>;

type UseCase = {
  headline: string;
  description: string;
  Icon: IconComponent;
};

const USE_CASES: UseCase[] = [
  {
    headline: 'Students',
    description: 'Turn your research into a thesis presentation in 60 seconds. Export a clean deck you can edit and present.',
    Icon: BookOpen,
  },
  {
    headline: 'Teachers',
    description: 'Create lesson plan slides for any subject instantly. Generate structured visuals that fit your classroom pace.',
    Icon: Megaphone,
  },
  {
    headline: 'Startups',
    description: 'Build investor-ready pitch decks that actually convert. Get crisp narrative structure and consistent design from one prompt.',
    Icon: Briefcase,
  },
  {
    headline: 'Marketing Teams',
    description: 'Generate campaign decks and client reports at scale. Keep your messaging aligned with fast, repeatable templates.',
    Icon: Users,
  },
];

export default function UseCasesPage() {
  return (
    <MarketingPageLayout
      title="Use Cases"
      description="Different teams, one workflow: turn ideas into polished presentations."
    >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USE_CASES.map((c) => (
            <div
              key={c.headline}
              className="rounded-2xl border border-black/[0.06] bg-white px-6 py-6"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 border border-black/[0.04]">
                  <c.Icon size={18} strokeWidth={1.5} className="text-slate-900" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">{c.headline}</h2>
              </div>

              <p className="text-slate-600 leading-relaxed text-sm">{c.description}</p>

              <div className="mt-5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primaryHover transition-colors"
                >
                  Try it free →
                </Link>
              </div>
            </div>
          ))}
        </div>
    </MarketingPageLayout>
  );
}

