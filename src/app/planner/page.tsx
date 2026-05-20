'use client';

import { PlannerNavbar } from '@/components/planner/PlannerNavbar';
import { PlannerChat } from '@/components/planner/PlannerChat';
import { PlannerOutline } from '@/components/planner/PlannerOutline';

export default function PlannerPage() {
  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-white text-neutral-900 selection:bg-primary/20">
      {/* Top Navigation */}
      <PlannerNavbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane - Chat Area */}
        <div className="flex w-1/2 min-w-[400px] flex-col border-r border-black/[0.04]">
          <PlannerChat />
        </div>

        {/* Right Pane - Live Outline Area */}
        <div className="flex flex-1 flex-col">
          <PlannerOutline />
        </div>
      </div>
    </div>
  );
}
