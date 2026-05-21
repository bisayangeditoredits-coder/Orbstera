/** Routes where smooth scroll and page transitions hurt responsiveness. */
const APP_ROUTE_PREFIXES = [
  '/editor',
  '/my-presentations',
  '/planner',
  '/account',
  '/settings',
  '/login',
  '/signup',
  '/register',
  '/auth',
  '/admin',
  '/share',
] as const;

export function isAppRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return APP_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function isMarketingRoute(pathname: string | null | undefined): boolean {
  return !isAppRoute(pathname);
}
