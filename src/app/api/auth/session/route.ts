import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  SESSION_STARTED_COOKIE,
  isSessionStartedAtExpired,
  sessionExpiresAtIso,
} from '@/lib/auth/session-policy';
import { getApiUser, isAdminUser, PRIVATE_API_HEADERS } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'unauthorized' },
      { status: 401, headers: PRIVATE_API_HEADERS },
    );
  }

  const startedAt = cookies().get(SESSION_STARTED_COOKIE)?.value;
  if (isSessionStartedAtExpired(startedAt)) {
    return NextResponse.json(
      { ok: false, error: 'session_expired' },
      { status: 401, headers: PRIVATE_API_HEADERS },
    );
  }

  const expiresAt = startedAt ? sessionExpiresAtIso(startedAt) : null;

  const isAdmin = await isAdminUser(user);

  return NextResponse.json(
    {
      ok: true,
      userId: user.id,
      sessionStartedAt: startedAt ?? null,
      expiresAt,
      isAdmin,
    },
    { headers: PRIVATE_API_HEADERS },
  );
}
