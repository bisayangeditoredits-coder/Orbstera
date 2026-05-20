import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Extract readable text from crude HTML (best-effort). */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24_000);
}

function isSafeUrl(urlString: string): boolean {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    
    const host = parsed.hostname.toLowerCase();
    
    // Block localhost
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false;
    
    // Block AWS metadata and link-local
    if (host === '169.254.169.254' || host === '169.254.169.253') return false;
    if (host.startsWith('169.254.')) return false;
    if (host.startsWith('fe80:')) return false;
    
    // Block private IP ranges
    if (/^10\./.test(host)) return false;
    if (/^192\.168\./.test(host)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return false;
    if (host.endsWith('.internal') || host.endsWith('.local')) return false;

    // Block hosts without a dot (internal cluster names like "redis")
    if (!host.includes('.')) return false;

    return true;
  } catch (e) {
    return false;
  }
}

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const ct = req.headers.get('content-type') || '';

  try {
    if (ct.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: 'file required' }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const { OfficeParser } = await import('officeparser');
      const ast = await OfficeParser.parseOffice(buf);
      const excerpt = ast.toText().slice(0, 24_000);
      return NextResponse.json({
        source: 'document',
        excerpt,
        hint: 'Paste into generation prompt or use Create flow.',
      });
    }

    const body = await req.json();
    const { url, sourceType } = body as { url?: string; sourceType?: string };

    if (sourceType === 'youtube' || (url && /youtube\.com|youtu\.be/.test(url))) {
      return NextResponse.json({
        source: 'youtube',
        excerpt: '',
        hint: 'YouTube transcript ingestion requires API credentials. Paste your outline or key ideas into the prompt for now.',
      });
    }

    if (url && /^https?:\/\//i.test(url)) {
      if (!isSafeUrl(url)) {
        return NextResponse.json({ error: 'URL is not allowed for security reasons' }, { status: 403 });
      }
      
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OrbsteraBot/1.0' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Fetch failed: ${res.status}` }, { status: 422 });
      }
      const html = await res.text();
      const excerpt = stripHtml(html);
      return NextResponse.json({
        source: 'url',
        excerpt,
        title: url,
      });
    }

    return NextResponse.json({ error: 'Provide multipart file or JSON { url }' }, { status: 400 });
  } catch (e) {
    console.error('[Ingest]', e);
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 });
  }
}
