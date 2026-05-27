'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { AnnouncementBanner } from './AnnouncementBanner';

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

  return (
    <div className="sticky top-0 z-[100] w-full bg-[#FDFCF9]">
      <AnnouncementBanner />
      <div className="px-4 pt-4 pb-3">
        <Navbar />
      </div>
    </div>
  );
}
