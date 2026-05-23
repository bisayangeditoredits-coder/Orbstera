'use client';

import React, { useState, useEffect } from 'react';
import { LeadModal } from './LeadModal';

export function GlobalLeadModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    
    window.addEventListener('open-lead-modal', handleOpen);
    return () => window.removeEventListener('open-lead-modal', handleOpen);
  }, []);

  return <LeadModal open={isOpen} onClose={() => setIsOpen(false)} />;
}
