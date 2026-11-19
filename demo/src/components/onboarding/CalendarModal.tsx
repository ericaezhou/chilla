"use client";

import { useState } from "react";
import { CalendarDays, Check, Loader2, X } from "lucide-react";
import type { CalendarProvider } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const PROVIDERS: { id: CalendarProvider; name: string; cls: string }[] = [
  { id: "google", name: "Google Calendar", cls: "bg-blue-soft" },
  { id: "outlook", name: "Outlook Calendar", cls: "bg-yellow" },
];

// Simulated calendar OAuth: pick a provider, review access, allow.
export function CalendarModal() {
  const { modal, setModal } = useWorkspace();
  return (
    <Modal open={modal === "calendar"} onClose={() => setModal(null)} title="Connect your calendar" icon={<CalendarDays size={18} />}>
      {modal === "calendar" && <CalendarFlow />}
    </Modal>
  );
}

function CalendarFlow() {
  const { connectCalendar, setModal, profile } = useWorkspace();
  const [provider, setProvider] = useState<CalendarProvider | null>(null);
  const [connecting, setConnecting] = useState(false);
  const chosen = PROVIDERS.find((p) => p.id === provider);

  if (!chosen) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted">Chilla compares your free time with your teammates&apos; so meetings land in a slot that works for both of you.</p>
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className="flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-white p-3 text-left font-bold shadow-brutal-sm hover:-translate-y-0.5 hover:bg-belly"
          >
            <span className={`grid h-9 w-9 place-items-center rounded-lg border-[1.5px] border-ink ${p.cls}`}>
              <CalendarDays size={18} />
            </span>
            Continue with {p.name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p>
        <b>Chilla</b> wants <b>free/busy access</b> to your {chosen.name} <span className="text-muted">({profile.email})</span>
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border-[1.5px] border-ink bg-mint/60 p-3">
          <p className="text-xs font-bold tracking-wide uppercase">Chilla can</p>
          <ul className="mt-1.5 space-y-1.5 text-sm">
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" /> <span>See <b>when</b> you&apos;re free or busy</span></li>
            <li className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0" /> <span>Add meetings <b>you</b> confirm in Chilla</span></li>
          </ul>
        </div>
        <div className="rounded-xl border-[1.5px] border-ink bg-white p-3">
          <p className="text-xs font-bold tracking-wide uppercase">Chilla can never</p>
          <ul className="mt-1.5 space-y-1.5 text-sm">
            <li className="flex gap-2"><X size={16} className="mt-0.5 shrink-0" /> Read event titles, notes or descriptions</li>
            <li className="flex gap-2"><X size={16} className="mt-0.5 shrink-0" /> See who you meet with, or where</li>
            <li className="flex gap-2"><X size={16} className="mt-0.5 shrink-0" /> Show your calendar to anyone, even teammates who ask</li>
            <li className="flex gap-2"><X size={16} className="mt-0.5 shrink-0" /> Edit or delete events it didn&apos;t create</li>
          </ul>
        </div>
      </div>

      <div className="rounded-xl border-[1.5px] border-dashed border-fur bg-paper p-3 text-sm">
        <p className="font-semibold">What Chilla actually receives</p>
        <div className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
          <span className="text-muted">10:00–10:30</span><span className="rounded bg-yellow px-1.5">Busy</span>
          <span className="text-muted">10:30–12:00</span><span className="px-1.5">Free</span>
          <span className="text-muted">12:00–13:00</span><span className="rounded bg-yellow px-1.5">Busy</span>
        </div>
        <p className="mt-2 text-xs text-muted">That&apos;s it: no titles, no attendees. You can disconnect anytime in <b>Settings</b>.</p>
      </div>
      <div className="flex justify-end gap-2 border-t-2 border-dashed border-ear pt-4">
        <button className="btn btn-ghost" onClick={() => setProvider(null)}>Back</button>
        <button
          className="btn btn-blue"
          disabled={connecting}
          onClick={() => {
            setConnecting(true);
            window.setTimeout(() => {
              connectCalendar(chosen.id);
              setModal(null);
            }, 900);
          }}
        >
          {connecting ? <><Loader2 size={15} className="animate-spin" /> Connecting…</> : "Allow"}
        </button>
      </div>
    </div>
  );
}
