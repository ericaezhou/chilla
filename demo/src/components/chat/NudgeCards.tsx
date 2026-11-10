"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, BellRing, Check, CornerDownRight, Flag } from "lucide-react";
import { getEmployee } from "@/data/employees";
import { formatDay, nextWeekdays, relativeDay, toISODate } from "@/lib/dates";
import { REPLY_STATUS, firstName, getMilestone, nextFollowUp, slipsPastMilestone } from "@/lib/nudges";
import type { IncomingNudge, NudgeReplyStatus } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

/** Where a nudge stands against the delivery timeline. */
export function MilestoneLine({ due, milestoneId }: { due: string; milestoneId?: string }) {
  const m = getMilestone(milestoneId);
  if (!m) return null;
  const late = slipsPastMilestone(due, milestoneId);
  return (
    <p className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${late ? "text-[#b4423f]" : "text-muted"}`}>
      {late ? <AlertTriangle size={13} /> : <Flag size={13} />}
      {late ? `Lands after ${m.name} (${formatDay(m.date)})` : `Unblocks ${m.name} · ${formatDay(m.date)}`}
    </p>
  );
}

// ---------- a nudge you sent ----------

export function NudgeCard({ nudgeId, compact }: { nudgeId: string; compact?: boolean }) {
  const { nudges, openProfile } = useWorkspace();
  const n = nudges.find((x) => x.id === nudgeId);
  const e = n && getEmployee(n.employeeId);
  if (!n || !e) return <p className="text-sm text-muted">Nudge (removed)</p>;
  const first = firstName(e.name);
  const steps = [
    { label: "Scheduled", done: true },
    { label: `Sent to ${first} as you`, done: n.status !== "sending" },
    { label: n.reply ? `${first} replied` : `Waiting on ${first}`, done: !!n.reply },
  ];

  return (
    <div className={`card-flat mt-1 max-w-xl p-3.5 ${n.reply ? "bg-white" : "bg-belly"}`}>
      <p className="flex items-center gap-2 font-bold">
        <BellRing size={16} /> Nudge {n.status === "sending" ? "scheduled" : "sent"} to{" "}
        <button className="underline" onClick={() => openProfile(e.id)}>{e.name}</button>
      </p>
      <p className="mt-1 text-sm">
        <b>Ask:</b> {n.ask} · <b>Due</b> {relativeDay(n.due)}
      </p>
      <MilestoneLine due={n.due} milestoneId={n.milestoneId} />

      {!compact && (
        <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
          {steps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className={`grid h-4.5 w-4.5 place-items-center rounded-full border-[1.5px] border-ink ${s.done ? "bg-ear" : "bg-white"}`}>
                {s.done && <Check size={10} strokeWidth={3} />}
              </span>
              <span className={s.done ? "" : "text-muted"}>{s.label}</span>
              {i < steps.length - 1 && <span className="text-ear">—</span>}
            </li>
          ))}
        </ol>
      )}

      {n.reply ? (
        <div className="mt-3 flex gap-2 rounded-lg border-[1.5px] border-ink bg-paper p-2.5 text-sm">
          <Avatar name={e.name} size="sm" />
          <div>
            <span className={`pill ${REPLY_STATUS[n.reply.status].cls}`}>
              {REPLY_STATUS[n.reply.status].emoji} {REPLY_STATUS[n.reply.status].label}
            </span>
            <p className="mt-1">{n.reply.text}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">
          {nextFollowUp(n.cadence, n.due) ? `If there's no reply, I'll follow up ${nextFollowUp(n.cadence, n.due)}.` : "I'll tell you when they reply."}
        </p>
      )}
      {!compact && (
        <Link href={`/dm/${e.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue hover:underline">
          <CornerDownRight size={12} /> Open your DM with {first}
        </Link>
      )}
    </div>
  );
}

// ---------- a nudge someone sent you ----------

const RESPONSES: NudgeReplyStatus[] = ["done", "on-track", "need-time", "blocked"];

export function IncomingNudgeCard({ incomingId }: { incomingId: string }) {
  const { incoming } = useWorkspace();
  const n = incoming.find((x) => x.id === incomingId);
  const from = n && getEmployee(n.fromId);
  if (!n || !from) return <p className="text-sm text-muted">Nudge (removed)</p>;
  return <IncomingNudgeBody n={n} fromName={from.name} />;
}

function IncomingNudgeBody({ n, fromName }: { n: IncomingNudge; fromName: string }) {
  const { respondToNudge } = useWorkspace();
  const [picking, setPicking] = useState<"need-time" | "blocked" | null>(null);
  const [note, setNote] = useState("");
  const first = firstName(fromName);
  const days = nextWeekdays(5).map(toISODate).filter((d) => d > n.due).slice(0, 4);
  const at = () => new Date().toISOString();

  const r = n.response;
  return (
    <div className={`card-flat mt-1 max-w-xl p-3.5 ${r ? "bg-white" : "bg-yellow/60 shadow-brutal-sm"}`} data-tour={r ? undefined : "respond-nudge"}>
      <p className="flex items-center gap-2 text-sm">
        <Avatar name={fromName} size="sm" />
        <span>
          <b>{fromName}</b> asked me to check in with you
        </span>
      </p>
      <p className="mt-2 font-semibold">“{n.ask}”</p>
      <p className="text-sm text-muted">Due {relativeDay(n.due)}</p>
      <MilestoneLine due={n.due} milestoneId={n.milestoneId} />

      {r ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className={`pill ${REPLY_STATUS[r.status].cls}`}>
            {REPLY_STATUS[r.status].emoji} {REPLY_STATUS[r.status].label}
          </span>
          {r.newDue && <span>new date {relativeDay(r.newDue)}</span>}
          {r.note && <span className="text-muted">“{r.note}”</span>}
          <span className="text-muted">· sent to {first}</span>
        </p>
      ) : picking === "need-time" ? (
        <div className="mt-3">
          <p className="label">When can you have it?</p>
          <div className="flex flex-wrap gap-1.5">
            {days.map((d) => (
              <button
                key={d}
                className="chip bg-white hover:bg-blue-soft"
                onClick={() => respondToNudge(n.id, { status: "need-time", newDue: d, note: `new date ${relativeDay(d)}`, at: at() })}
              >
                {formatDay(d)}
              </button>
            ))}
            <button className="chip bg-transparent text-muted" onClick={() => setPicking(null)}>Back</button>
          </div>
        </div>
      ) : picking === "blocked" ? (
        <form
          className="mt-3 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            respondToNudge(n.id, { status: "blocked", note: note.trim() || undefined, at: at() });
          }}
        >
          <input className="input py-2 text-sm" autoFocus placeholder={`What's blocking you? ${first} will see this`} value={note} onChange={(e) => setNote(e.target.value)} />
          <button className="btn btn-sm">Send</button>
        </form>
      ) : (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {RESPONSES.map((s) => (
            <button
              key={s}
              className="btn btn-ghost btn-sm"
              onClick={() =>
                s === "need-time" || s === "blocked" ? setPicking(s) : respondToNudge(n.id, { status: s, at: at() })
              }
            >
              {REPLY_STATUS[s].emoji} {s === "need-time" ? "Need more time" : REPLY_STATUS[s].label}
            </button>
          ))}
        </div>
      )}
      {!r && (
        <Link href={`/dm/${n.fromId}`} className="mt-2 inline-block text-xs font-semibold text-blue hover:underline">
          Or reply to {first} in a DM
        </Link>
      )}
    </div>
  );
}
