'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COOKIE_CONSENT_KEY = 'orbstera_cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      // Small delay so it doesn't flash on initial load
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setVisible(false);
  };

  const openSettings = () => {
    // Can be expanded to a full settings modal later
    reject();
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[calc(100vw-2rem)] max-w-3xl"
    >
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.14)] border border-black/[0.06] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Text area */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-[20px] shrink-0 leading-none mt-0.5">ðŸª</span>
          <div>
            <p className="text-[13px] font-bold text-neutral-900 mb-0.5">About our cookies</p>
            <p className="text-[12px] text-neutral-500 leading-relaxed">
              We use cookies and similar technologies as set out in our{' '}
              <Link href="/privacy" className="text-blue-600 font-semibold hover:underline">
                Cookie Notice
              </Link>
              . By clicking <strong>ACCEPT</strong>, you agree to our use of optional cookies and similar technologies for the purposes set out in our{' '}
              <Link href="/privacy" className="text-blue-600 font-semibold hover:underline">
                Cookie Notice
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 sm:ml-2">
          <button
            id="cookie-settings-btn"
            onClick={openSettings}
            className="h-9 px-4 rounded-full border border-neutral-300 text-[12px] font-bold text-neutral-700 hover:bg-neutral-50 transition-all whitespace-nowrap"
          >
            Cookie Settings
          </button>
          <button
            id="cookie-reject-btn"
            onClick={reject}
            className="h-9 px-4 rounded-full bg-[#1a2340] text-white text-[12px] font-bold hover:bg-[#232f52] transition-all whitespace-nowrap"
          >
            Reject All
          </button>
          <button
            id="cookie-accept-btn"
            onClick={accept}
            className="h-9 px-5 rounded-full bg-[#1a2340] text-white text-[12px] font-bold hover:bg-[#232f52] transition-all whitespace-nowrap"
          >
            ACCEPT
          </button>
        </div>
      </div>
    </div>
  );
}
