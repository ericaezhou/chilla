"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useHydrated } from "@/lib/storage";
import { AppDirectory } from "@/components/onboarding/AppDirectory";
import { ChillaAvatar } from "@/components/ui/Mascot";
import { useWorkspace } from "./WorkspaceProvider";

// Header for the Chilla app, with Slack-style app tabs.
// Add a tab here, then create the matching route in src/app/(chilla)/.
export const CHILLA_TABS = [
  { href: "/home", label: "Home" },
  { href: "/", label: "Messages" },
  { href: "/nudges", label: "Nudges" },
  { href: "/directory", label: "Directory" },
  { href: "/meetings", label: "Meetings" },
  { href: "/profile", label: "My profile" },
  { href: "/settings", label: "Settings" },
  { href: "/help", label: "Help" },
];

export function ChillaHeader() {
  const pathname = usePathname();
  const { incoming } = useWorkspace();
  const unanswered = incoming.filter((n) => !n.response).length;
  return (
    <div className="shrink-0 border-b-2 border-ink bg-white">
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 sm:px-5">
        <ChillaAvatar size={34} />
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg leading-tight font-extrabold tracking-tight">
            Chilla <span className="rounded bg-ear px-1.5 text-[0.6rem] font-bold">APP</span>
          </p>
          <p className="truncate text-xs text-muted">Find the person who knows.</p>
        </div>
      </div>
      <div className="scroll-thin flex gap-1 overflow-x-auto px-3 sm:px-4" role="tablist">
        {CHILLA_TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              role="tab"
              aria-selected={active}
              data-tour={t.href === "/directory" ? "directory-tab" : t.href === "/nudges" ? "nudges-tab" : undefined}
              className={`-mb-[2px] flex shrink-0 items-center gap-1.5 border-b-[3px] px-3 py-2 text-sm font-semibold ${
                active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              {t.href === "/nudges" && unanswered > 0 && (
                <span className="grid h-4.5 min-w-4.5 place-items-center rounded-full bg-nose px-1 text-[0.65rem] font-bold text-ink">{unanswered}</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** Shows the app, or the App Directory listing until Chilla is installed. */
export function ChillaGate({ children }: { children: React.ReactNode }) {
  const { integrations } = useWorkspace();
  const hydrated = useHydrated();
  if (!hydrated) return <div className="flex-1" />;
  if (!integrations.slack) return <AppDirectory />;
  return (
    <>
      <ChillaHeader />
      {children}
    </>
  );
}
