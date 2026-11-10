"use client";

import Link from "next/link";
import { BellRing, CalendarClock, Check, ChevronRight, Search, ShieldCheck } from "lucide-react";
import { company } from "@/data/workspace";
import { ChillaAvatar, Mascot } from "@/components/ui/Mascot";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const FEATURES = [
  { icon: Search, title: "Find the person who knows", body: "Ask in plain English and get the top 2–3 people, ranked by what they actually work on." },
  { icon: CalendarClock, title: "Book time in one click", body: "Syncs with your calendar and suggests slots when you're both free." },
  { icon: BellRing, title: "Nudges on your behalf", body: "Follows up with cross-functional POCs, checked against your delivery timeline." },
];

const PERMISSIONS = [
  "View messages in channels Chilla is added to",
  "View people's profiles (name, title, team)",
  "Send messages as @chilla, and as you only for nudges you approve",
  "Add the /chilla command",
];

// Slack's App Directory listing for Chilla. This is where the tour starts.
export function AppDirectory() {
  const { integrations, setModal } = useWorkspace();
  const installed = integrations.slack;

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-paper/50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <p className="flex items-center gap-1 text-sm text-muted">
          App Directory <ChevronRight size={14} /> Productivity <ChevronRight size={14} /> <span className="font-semibold text-ink">Chilla</span>
        </p>

        <section className="card mt-3 flex flex-col gap-5 p-5 sm:flex-row sm:items-start sm:p-6">
          <ChillaAvatar size={88} />
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-black tracking-tight">Chilla</h1>
            <p className="font-medium">Find the person who knows.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="pill bg-blue-soft">Productivity</span>
              <span className="pill bg-yellow">Project management</span>
              <span className="pill bg-mint">
                <ShieldCheck size={12} /> Approved by your {company.name} admin
              </span>
            </div>
            <p className="mt-3 max-w-xl text-[0.95rem] text-muted">
              Chilla is the PM&apos;s sidekick inside Slack. It tells you who to ask, books the meeting, and follows up so work keeps moving.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {installed ? (
              <>
                <span className="pill bg-mint"><Check size={12} /> Installed</span>
                <Link href="/" className="btn">Open Chilla</Link>
              </>
            ) : (
              <button className="btn btn-blue px-6 py-3.5 text-base" onClick={() => setModal("install")} data-tour="install">
                Add to Slack
              </button>
            )}
            <p className="text-xs text-muted">Also coming to Microsoft Teams</p>
          </div>
        </section>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`card-flat p-4 shadow-brutal-sm ${i === 1 ? "sm:rotate-1" : i === 2 ? "sm:-rotate-1" : ""}`}>
              <f.icon size={20} className="text-blue" />
              <h2 className="mt-2 font-extrabold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 pb-8 sm:grid-cols-[1fr_auto]">
          <section className="card-flat p-5">
            <h2 className="font-extrabold">What Chilla can access</h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              {PERMISSIONS.map((p) => (
                <li key={p} className="flex gap-2"><Check size={15} className="mt-0.5 shrink-0 text-green" /> {p}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Chilla never reads private DMs between other people. You can remove it anytime.</p>
          </section>
          <div className="hidden items-end sm:flex">
            <div className="relative">
              <Mascot className="h-28 w-28 -rotate-6" />
              <p className="hand absolute -top-6 -left-24 w-28 -rotate-6 text-lg">it only hears what you let it 👂</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
