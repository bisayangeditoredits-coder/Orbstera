import Link from 'next/link';
import { notFound } from 'next/navigation';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Lock } from 'lucide-react';
import { PublicViewer } from '@/components/viewer/PublicViewer';
import { getBillingPlan } from '@/lib/billing/resolve-plan';

export const dynamic = 'force-dynamic';

let s3Client: S3Client | null = null;
if (
  process.env.CLOUDFLARE_R2_ENDPOINT &&
  process.env.CLOUDFLARE_R2_ACCESS_KEY &&
  process.env.CLOUDFLARE_R2_SECRET_KEY
) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY,
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY,
    },
  });
}

async function streamToString(stream: any): Promise<string> {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf-8');
}

function PrivateShareGate() {
  return (
    <div className="min-h-screen bg-[#010104] text-white flex flex-col items-center justify-center font-sans px-6">
      <div className="w-16 h-16 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center mb-6">
        <Lock size={28} className="text-white/70" strokeWidth={1.75} />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-center">This presentation is private</h1>
      <p className="text-white/55 mb-8 max-w-md text-center text-sm leading-relaxed text-balance">
        The creator has restricted access. Ask them to set sharing to &quot;Anyone with the link&quot; in Orbstera.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/login"
          className="px-6 py-3 bg-primary text-white font-bold rounded-full hover:opacity-90 transition-opacity text-sm"
        >
          Sign in
        </Link>
        <Link
          href="/"
          className="px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/15 transition-colors text-sm ring-1 ring-white/10"
        >
          Go to Orbstera
        </Link>
      </div>
    </div>
  );
}

function NotFoundShare() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans px-6">
      <h1 className="text-3xl font-bold mb-4">Presentation not found</h1>
      <p className="text-white/60 mb-8 max-w-md text-center text-balance text-sm">
        This link may have expired or the presentation has been deleted by its creator.
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-white/90 transition-colors text-sm"
      >
        Create your own with Orbstera
      </Link>
    </div>
  );
}

export default async function PublicPresentationPage({
  params,
}: {
  params: { userId: string; id: string };
}) {
  const { userId, id } = params;

  if (!userId || !id || !s3Client || !process.env.CLOUDFLARE_R2_BUCKET_NAME) {
    notFound();
  }

  const prefix = `presentations/${userId}`;
  const deckKey = `${prefix}/${id}.json`;

  try {
    const response = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
        Key: deckKey,
      }),
    );

    const bodyText = await streamToString(response.Body);
    const presentation = JSON.parse(bodyText);

    if (!presentation || !presentation.slides) {
      return <NotFoundShare />;
    }

    if (presentation.shareAccess !== 'public_view') {
      return <PrivateShareGate />;
    }

    const ownerPlan = await getBillingPlan(userId);

    return (
      <main className="w-full h-screen bg-[#010104] overflow-hidden">
        <PublicViewer presentation={presentation} ownerPlan={ownerPlan} />
      </main>
    );
  } catch (error: any) {
    if (error?.name === 'NoSuchKey') {
      return <NotFoundShare />;
    }
    console.error('R2 Get Error:', error);
    return <NotFoundShare />;
  }
}
