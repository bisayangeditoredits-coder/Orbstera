'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';

export function GlobalNavbar() {
  const pathname = usePathname();

  // Pages that should NOT have the Navbar
  const hiddenRoutes = [
    '/editor',
    '/login',
    '/signup',
    '/register',
    '/auth',
    '/my-presentations',
    '/account',
    '/settings',
    '/planner',
  ];
  const isHidden = hiddenRoutes.some(route => pathname.startsWith(route));

  if (isHidden) return null;

  return <Navbar />;
}
