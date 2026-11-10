"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FileText, Hash, Headphones, MessageSquareText, PenSquare, Plus, SendHorizontal } from "lucide-react";
import { getEmployee } from "@/data/employees";
import { channels, company, sidebarDMs } from "@/data/workspace";
import { Avatar } from "@/components/ui/Avatar";
import { ChillaAvatar } from "@/components/ui/Mascot";
import { CHILLA_TABS } from "./ChillaHeader";
import { useWorkspace } from "./WorkspaceProvider";

// Slack-style left sidebar. Channels, DMs and the Chilla app are routes.

const CHILLA_ROUTES = CHILLA_TABS.map((t) => t.href);

export function Sidebar() {
  const pathname = usePathname();
  const { setSidebarOpen, showToast, profile, integrations, incoming, settings } = useWorkspace();
  const close = () => setSidebarOpen(false);
  const chillaActive = CHILLA_ROUTES.includes(pathname);
  const unanswered = incoming.filter((n) => !n.response).length;
  const soon = (what: string) => () => showToast(`${what} aren't part of this demo`);

  return (
    <nav className="scroll-thin flex h-full w-64 flex-col overflow-y-auto bg-ink text-ear" aria-label="Workspace">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <button
          className="flex items-center gap-1 text-lg font-extrabold tracking-tight text-white"
          onClick={() => showToast(`You're in the ${company.name} workspace`)}
        >
          {company.name} <ChevronDown size={16} />
        </button>
        <button
          className="grid h-8 w-8 place-items-center rounded-lg bg-white text-ink"
          aria-label="New message"
          onClick={() => showToast("Tip: type / in any message box for Chilla commands")}
        >
          <PenSquare size={15} />
        </button>
      </div>

      <div className="space-y-5 px-2 py-4 text-[0.95rem]">
        <div className="space-y-0.5">
          <QuickLink icon={<MessageSquareText size={15} />} label="Threads" onClick={soon("Threads")} />
          <QuickLink icon={<Headphones size={15} />} label="Huddles" onClick={soon("Huddles")} />
          <QuickLink icon={<SendHorizontal size={15} />} label="Drafts & sent" onClick={soon("Drafts")} />
          <QuickLink icon={<FileText size={15} />} label="Canvases" onClick={soon("Canvases")} />
        </div>

        <Section title="Channels">
          {channels.map((c) => (
            <NavLink key={c.slug} href={`/c/${c.slug}`} active={pathname === `/c/${c.slug}`} onClick={close}>
              <Hash size={15} className="opacity-70" />
              {c.name}
              {integrations.channels.includes(c.slug) && <span className="ml-auto opacity-60" title="Chilla is in this channel">🐭</span>}
            </NavLink>
          ))}
          <button
            onClick={() => showToast("Channels are fixed in this demo")}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left opacity-70 hover:bg-white/10"
          >
            <Plus size={15} /> Add channels
          </button>
        </Section>

        <Section title="Direct messages">
          {sidebarDMs.map((id) => {
            const e = getEmployee(id);
            if (!e) return null;
            return (
              <NavLink key={id} href={`/dm/${id}`} active={pathname === `/dm/${id}`} onClick={close}>
                <Avatar name={e.name} size="sm" status={settings.showAvailability ? e.availability : undefined} />
                <span className="truncate">{e.name}</span>
              </NavLink>
            );
          })}
          <NavLink href="/profile" active={false} onClick={close}>
            <Avatar name={profile.name} size="sm" status="available" />
            <span className="truncate">
              {profile.name} <span className="opacity-60">(you)</span>
            </span>
          </NavLink>
        </Section>

        <Section title="Apps">
          {integrations.slack && (
            <NavLink href="/" active={chillaActive} onClick={close}>
              <ChillaAvatar size={22} />
              Chilla
              {unanswered > 0 ? (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-nose px-1 text-[0.7rem] font-bold text-ink">{unanswered}</span>
              ) : (
                <span className="ml-auto rounded bg-nose px-1.5 text-[0.6rem] font-bold text-ink">APP</span>
              )}
            </NavLink>
          )}
          <NavLink href="/apps" active={pathname === "/apps"} onClick={close}>
            <span className="grid h-[22px] w-[22px] place-items-center rounded-md border border-white/30">
              <Plus size={13} />
            </span>
            Add apps
          </NavLink>
        </Section>
      </div>

      <div className="mt-auto border-t border-white/10 p-3">
        <div className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-xs">
          <MessageSquareText size={16} className="mt-0.5 shrink-0 text-nose" />
          <p>
            <span className="font-semibold text-white">Simulated Slack workspace.</span>{" "}
            {integrations.slack ? (
              <>
                Mention <code className="text-nose">@chilla</code> or type <code className="text-nose">/chilla</code> anywhere.
              </>
            ) : (
              "Add Chilla from Apps to get started."
            )}
          </p>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, active, onClick, children }: { href: string; active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${active ? "bg-blue font-semibold text-white" : "hover:bg-white/10"}`}
    >
      {children}
    </Link>
  );
}

function QuickLink({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left opacity-80 hover:bg-white/10 hover:opacity-100">
      {icon} {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1 px-2 text-xs font-bold tracking-wide uppercase opacity-60">
        <ChevronDown size={12} /> {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
