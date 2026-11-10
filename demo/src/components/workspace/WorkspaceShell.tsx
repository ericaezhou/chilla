"use client";

import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { resetDemoData } from "@/lib/storage";
import { Mascot } from "@/components/ui/Mascot";
import { MeetingModal } from "@/components/meeting/MeetingModal";
import { NudgeModal } from "@/components/nudges/NudgeModal";
import { CalendarModal } from "@/components/onboarding/CalendarModal";
import { InstallModal } from "@/components/onboarding/InstallModal";
import { ProfileSetupModal } from "@/components/onboarding/ProfileSetupModal";
import { TourComplete, TourGuide, WelcomeModal } from "@/components/onboarding/Tour";
import { ProfilePanel } from "@/components/people/ProfilePanel";
import { Sidebar } from "./Sidebar";
import { Toast } from "./Toast";
import { TopBar } from "./TopBar";
import { WorkspaceRail } from "./WorkspaceRail";
import { useWorkspace } from "./WorkspaceProvider";

// The fake Slack window: a demo banner, the window frame, rail, sidebar, main
// pane, and the global overlays (profile panel, modals, tour, toast).
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { sidebarOpen, setSidebarOpen } = useWorkspace();

  return (
    <div className="flex h-dvh flex-col md:p-4 md:pt-3">
      <div className="hidden items-center justify-between px-1 pb-3 md:flex">
        <div className="flex items-center gap-2 text-2xl font-black tracking-tighter">
          <Mascot className="h-9 w-9" /> chilla
          <span className="pill ml-1 bg-blue-soft text-blue">interactive demo</span>
        </div>
        <div className="flex items-center gap-4">
          <p className="hand -rotate-1 text-xl">a pretend Slack workspace, so poke around!</p>
          <button
            className="flex items-center gap-1 text-xs font-semibold text-muted underline hover:text-ink"
            onClick={() => confirm("Start over? This clears everything you've done in the demo.") && resetDemoData()}
          >
            <RotateCcw size={12} /> Restart tour
          </button>
        </div>
      </div>

      <div className="card relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border-0 shadow-none md:rounded-[14px] md:border-2 md:shadow-brutal">
        <TopBar />
        <div className="flex min-h-0 flex-1">
          <WorkspaceRail />
          <div className="hidden md:block">
            <Sidebar />
          </div>
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 flex md:hidden">
              <div className="animate-pop shadow-brutal">
                <Sidebar />
              </div>
              <button className="flex-1 bg-ink/40" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />
            </div>
          )}
          <main className="flex min-w-0 flex-1 flex-col bg-white">{children}</main>
          <ProfilePanel />
        </div>
      </div>

      <MeetingModal />
      <NudgeModal />
      <InstallModal />
      <CalendarModal />
      <ProfileSetupModal />
      <WelcomeModal />
      <TourComplete />
      <TourGuide />
      <Toast />
    </div>
  );
}
