"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Ellipsis, House, MessagesSquare } from "lucide-react";
import { company, sidebarDMs } from "@/data/workspace";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "./WorkspaceProvider";

// Slack's narrow far-left rail: workspace switcher, Home, DMs, Activity, More.
export function WorkspaceRail() {
  const pathname = usePathname();
  const { profile, incoming, integrations, showToast } = useWorkspace();
  const unanswered = incoming.filter((n) => !n.response).length;
  const inDMs = pathname.startsWith("/dm/");

  return (
    <div className="hidden w-[64px] shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-ink-2 py-3 text-ear md:flex">
      <button
        className="mb-2 grid h-10 w-10 place-items-center rounded-xl border-2 border-white/80 bg-nose text-lg font-black text-ink"
        title={company.name}
        onClick={() => showToast(`${company.name} is the only workspace in this demo`)}
      >
        {company.name[0]}
      </button>
      <RailItem href={integrations.slack ? "/home" : "/apps"} label="Home" active={!inDMs}>
        <House size={19} />
      </RailItem>
      <RailItem href={`/dm/${sidebarDMs[0]}`} label="DMs" active={inDMs}>
        <MessagesSquare size={19} />
      </RailItem>
      <RailItem href={integrations.slack ? "/nudges" : "/apps"} label="Activity" badge={unanswered}>
        <Bell size={19} />
      </RailItem>
      <button className="flex flex-col items-center gap-0.5 rounded-lg p-1 text-[0.65rem] font-semibold hover:text-white" onClick={() => showToast("Nothing else to see here 🐭")}>
        <span className="grid h-9 w-9 place-items-center rounded-lg hover:bg-white/10"><Ellipsis size={19} /></span>
        More
      </button>
      <Link href="/profile" className="mt-auto" aria-label="My profile">
        <Avatar name={profile.name} size="md" status="available" />
      </Link>
    </div>
  );
}

function RailItem({ href, label, active, badge, children }: { href: string; label: string; active?: boolean; badge?: number; children: React.ReactNode }) {
  return (
    <Link href={href} className={`relative flex flex-col items-center gap-0.5 rounded-lg p-1 text-[0.65rem] font-semibold ${active ? "text-white" : "hover:text-white"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${active ? "bg-white/20" : "hover:bg-white/10"}`}>{children}</span>
      {label}
      {!!badge && (
        <span className="absolute top-0 right-0 grid h-4.5 min-w-4.5 place-items-center rounded-full border border-ink bg-nose px-1 text-[0.62rem] font-bold text-ink">
          {badge}
        </span>
      )}
    </Link>
  );
}
