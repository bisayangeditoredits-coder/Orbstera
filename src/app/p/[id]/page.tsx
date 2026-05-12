import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { PublicViewer } from '@/components/viewer/PublicViewer';

export const dynamic = 'force-dynamic';

export default async function PublicPresentationPage({ params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) {
    notFound();
  }

  // We use the service role key to bypass RLS and allow anyone with the link to view the presentation.
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
      },
    }
  );

  const { data: presentation, error } = await supabase
    .from('presentations')
    .select('body')
    .eq('id', id)
    .single();

  if (error || !presentation || !presentation.body) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans">
        <h1 className="text-3xl font-bold mb-4">Presentation Not Found</h1>
        <p className="text-white/60 mb-8 max-w-md text-center text-balance">
          This link may have expired or the presentation has been deleted by its creator.
        </p>
        <a href="/" className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors">
          Create your own with Orbstera AI
        </a>
      </div>
    );
  }

  return (
    <main className="w-full h-screen bg-[#010104] overflow-hidden">
      <PublicViewer presentation={presentation.body} />
    </main>
  );
}
