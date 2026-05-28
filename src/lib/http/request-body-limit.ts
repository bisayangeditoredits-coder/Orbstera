import { NextResponse } from 'next/server';
import { PRIVATE_API_HEADERS } from '@/lib/auth/server';

function tooLargeResponse(limitBytes: number) {
  return NextResponse.json(
    {
      error: 'Payload too large',
      code: 'PAYLOAD_TOO_LARGE',
      maxBytes: limitBytes,
    },
    { status: 413, headers: PRIVATE_API_HEADERS },
  );
}

export function enforceContentLengthLimit(
  req: Request,
  limitBytes: number,
): NextResponse | null {
  const raw = req.headers.get('content-length');
  if (!raw) return null;
  const length = Number(raw);
  if (!Number.isFinite(length)) {
    return NextResponse.json(
      { error: 'Invalid Content-Length' },
      { status: 400, headers: PRIVATE_API_HEADERS },
    );
  }
  if (length > limitBytes) return tooLargeResponse(limitBytes);
  return null;
}

export async function readTextBodyWithLimit(
  req: Request,
  limitBytes: number,
): Promise<{ ok: true; text: string } | { ok: false; response: NextResponse }> {
  const headerCheck = enforceContentLengthLimit(req, limitBytes);
  if (headerCheck) return { ok: false, response: headerCheck };

  const text = await req.text();
  const bytes = Buffer.byteLength(text, 'utf8');
  if (bytes > limitBytes) {
    return { ok: false, response: tooLargeResponse(limitBytes) };
  }
  return { ok: true, text };
}

export async function readJsonBodyWithLimit<T>(
  req: Request,
  limitBytes: number,
): Promise<{ ok: true; value: T } | { ok: false; response: NextResponse }> {
  const textResult = await readTextBodyWithLimit(req, limitBytes);
  if (!textResult.ok) return textResult;
  try {
    const value = JSON.parse(textResult.text) as T;
    return { ok: true, value };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400, headers: PRIVATE_API_HEADERS },
      ),
    };
  }
}

export async function readArrayBufferWithLimit(
  req: Request,
  limitBytes: number,
): Promise<{ ok: true; buffer: ArrayBuffer } | { ok: false; response: NextResponse }> {
  const headerCheck = enforceContentLengthLimit(req, limitBytes);
  if (headerCheck) return { ok: false, response: headerCheck };

  const buffer = await req.arrayBuffer();
  if (buffer.byteLength > limitBytes) {
    return { ok: false, response: tooLargeResponse(limitBytes) };
  }
  return { ok: true, buffer };
}
