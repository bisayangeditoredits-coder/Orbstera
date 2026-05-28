import { NextResponse } from 'next/server';
import { z } from 'zod';
import { enforceContactRateLimit } from '@/lib/rate-limit-server';
import { withRouteError } from '@/lib/api/with-route-error';
import { readJsonBodyWithLimit } from '@/lib/http/request-body-limit';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(8000),
});
const MAX_BODY_BYTES = 32 * 1024;

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function postContact(req: Request) {
  const limited = await enforceContactRateLimit(req);
  if (limited) return limited;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  const from =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Orbstera <onboarding@resend.dev>';

  if (!apiKey || !to) {
    return NextResponse.json(
      { ok: false, error: 'CONTACT_NOT_CONFIGURED' as const },
      { status: 503 },
    );
  }

  const bodyResult = await readJsonBodyWithLimit<unknown>(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;
  const json = bodyResult.value;

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'VALIDATION' as const, details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, email, message } = parsed.data;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[Orbstera contact] ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
      html: `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error('[api/contact] Resend', res.status, t);
    return NextResponse.json({ ok: false, error: 'SEND_FAILED' as const }, { status: 502 });
  }

  return NextResponse.json({ ok: true as const });
}

export const POST = withRouteError('POST /api/contact', postContact);
