import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { convertPptxBufferToPresentation } from '@/lib/import/pptxToPresentation';
import { withRouteError } from '@/lib/api/with-route-error';
import { enforceContentLengthLimit } from '@/lib/http/request-body-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_BYTES = 40 * 1024 * 1024;
const MAX_MULTIPART_BYTES = 42 * 1024 * 1024;

async function getAuthUser() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function postImport(req: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type') || '';
  if (!ct.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }
  const sizeCheck = enforceContentLengthLimit(req, MAX_MULTIPART_BYTES);
  if (sizeCheck) return sizeCheck;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Could not read upload body.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'Missing file field' }, { status: 400 });
  }

  const name = (file as File).name || 'upload.pptx';
  const lower = name.toLowerCase();

  if (!lower.endsWith('.pptx')) {
    if (lower.endsWith('.ppt')) {
      return NextResponse.json(
        {
          error: 'Legacy .ppt format is not supported in the browser yet.',
          code: 'UNSUPPORTED_PPT',
          conversionHint:
            'Open the file in PowerPoint or LibreOffice and save as .pptx, then import again. ' +
            'A future server-side converter (LibreOffice worker or conversion API) can automate this.',
        },
        { status: 415 },
      );
    }
    return NextResponse.json({ error: 'Only .pptx files are supported.' }, { status: 415 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Presentation exceeds maximum size of ${Math.round(MAX_BYTES / (1024 * 1024))} MB.` },
      { status: 413 },
    );
  }

  try {
    const buf = Buffer.from(await file.arrayBuffer());
    const { presentation, warnings } = await convertPptxBufferToPresentation(buf, { fileName: name });
    presentation.userId = user.id;
    return NextResponse.json({ presentation, warnings });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Import failed';
    console.error('[import/presentation]', e);
    return NextResponse.json({ error: msg, code: 'IMPORT_PARSE_ERROR' }, { status: 422 });
  }
}

export const POST = withRouteError('POST /api/import/presentation', postImport);
