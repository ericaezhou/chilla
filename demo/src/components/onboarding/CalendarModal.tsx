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
        <b>Chilla</b> wants to access your {chosen.name} <span className="text-muted">({profile.email})</span>
      </p>
      <ul className="space-y-1.5 text-sm">
        <li className="flex gap-2"><Check size={16} className="shrink-0 text-green" /> See when you&apos;re free or busy</li>
        <li className="flex gap-2"><Check size={16} className="shrink-0 text-green" /> Add meetings you confirm in Chilla</li>
        <li className="flex gap-2 text-muted"><X size={16} className="shrink-0" /> It can&apos;t read who you meet with or what&apos;s in your notes</li>
      </ul>
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
