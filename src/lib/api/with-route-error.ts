import { NextResponse } from 'next/server';
import { PRIVATE_API_HEADERS } from '@/lib/auth/server';
import { captureApiException } from '@/lib/observability';

/**
 * Catches unhandled exceptions in App Router route handlers so clients get JSON 500
 * instead of an opaque platform error page.
 */
export function withRouteError<T extends unknown[]>(
  routeName: string,
  handler: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await handler(...args);
    } catch (err) {
      captureApiException(err, { route: routeName });
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again.',
        },
        { status: 500, headers: PRIVATE_API_HEADERS },
      );
    }
  };
}
