import { notFound } from 'next/navigation';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { PublicViewer } from '@/components/viewer/PublicViewer';

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

export default async function PublicPresentationPage({ params }: { params: { userId: string; id: string } }) {
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
      })
    );

    const bodyText = await streamToString(response.Body);
    const presentation = JSON.parse(bodyText);

    if (!presentation || !presentation.slides) {
      throw new Error("Invalid presentation format");
    }

    return (
      <main className="w-full h-screen bg-[#010104] overflow-hidden">
        <PublicViewer presentation={presentation} />
      </main>
    );
  } catch (error: any) {
    console.error('R2 Get Error:', error);
    
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
}
