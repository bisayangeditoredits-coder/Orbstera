'use client';

import { Sparkles, LayoutTemplate, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function OnboardingModal({
  isOpen,
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      panelClassName="overflow-hidden p-0 shadow-modal"
    >
      <div className="relative flex h-[220px] w-full flex-col items-center justify-end overflow-hidden bg-gradient-to-br from-indigo-50 via-sky-50 to-white px-8 pt-8">
        <div className="relative flex w-full flex-1 flex-col overflow-hidden rounded-t-md border border-neutral-200/60 bg-white shadow-lg">
          <div className="flex h-8 items-center gap-2 border-b border-neutral-100 bg-neutral-50/50 px-3">
            <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <div className="ml-2 h-3 w-24 rounded-sm bg-neutral-200/80" />
          </div>
          <div className="flex flex-col gap-3 p-4">
            <div className="w-3/4 self-end rounded-md bg-primary/10 px-3 py-1.5 text-[10px] font-medium text-primary">
              Generate a pitch deck for a new SaaS product
            </div>
            <div className="flex w-5/6 flex-col gap-2 self-start rounded-md bg-neutral-100/80 px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} className="text-primary" />
                <div className="h-2 w-16 rounded-sm bg-neutral-300" />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="h-1.5 w-full rounded-sm bg-neutral-200" />
                <div className="h-1.5 w-4/5 rounded-sm bg-neutral-200" />
                <div className="h-1.5 w-2/3 rounded-sm bg-neutral-200" />
              </div>
              <div className="mt-1 flex h-12 w-full items-center justify-center rounded-md border border-primary/20 bg-white shadow-sm">
                <LayoutTemplate size={16} className="text-primary/60" />
                <div className="ml-2 flex flex-col gap-1">
                  <div className="h-1.5 w-16 rounded-sm bg-neutral-200" />
                  <div className="h-1 w-10 rounded-sm bg-neutral-100" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-white via-white/10 to-transparent" />
      </div>

      <div className="flex flex-col items-center bg-white px-8 pb-8 pt-4 text-center">
        <h2 className="mb-2.5 text-[22px] font-bold leading-tight tracking-tight text-neutral-900">
          Meet Orbstera AI Planner
        </h2>
        <p className="mb-8 text-[14px] leading-relaxed text-neutral-500">
          Plans your slides, uses AI to write content, and designs beautiful presentations automatically. Just tell it what you need.
        </p>
        <Button onClick={onConfirm} size="lg" className="w-full sm:w-[85%]">
          Start Creating
          <ArrowRight size={16} />
        </Button>
      </div>
    </Modal>
  );
}
