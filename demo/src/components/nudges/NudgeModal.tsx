"use client";

import { useState } from "react";
import { AlertTriangle, BellRing, RotateCcw } from "lucide-react";
import { employees, getEmployee } from "@/data/employees";
import { milestones } from "@/data/workspace";
import { formatDay, relativeDay, toISODate, weekdayFromToday } from "@/lib/dates";
import { CADENCE_LABELS, draftNudge, firstName, getMilestone, milestoneDate, slipsPastMilestone } from "@/lib/nudges";
import type { NudgeCadence, NudgeTone } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useWorkspace, type NudgeTarget } from "@/components/workspace/WorkspaceProvider";

// Slack-style modal to have Chilla follow up with someone on your behalf.
export function NudgeModal() {
  const { nudgeTarget, closeNudge } = useWorkspace();
  return (
    <Modal open={!!nudgeTarget} onClose={closeNudge} title="New nudge" icon={<BellRing size={18} />}>
      {nudgeTarget && <NudgeForm key={JSON.stringify(nudgeTarget)} target={nudgeTarget} />}
    </Modal>
  );
}

const DUE_OPTIONS = [0, 1, 2, 3, 4, 5];

function NudgeForm({ target }: { target: NudgeTarget }) {
  const { profile, settings, createNudge, closeNudge, showToast } = useWorkspace();
  const [employeeId, setEmployeeId] = useState(target.employeeId ?? "");
  const [ask, setAsk] = useState(target.ask ?? "");
  const [due, setDue] = useState(target.due ?? toISODate(weekdayFromToday(2)));
  const [milestoneId, setMilestoneId] = useState(target.milestoneId ?? "");
  const [cadence, setCadence] = useState<NudgeCadence>(settings.nudgeCadence);
  const [tone, setTone] = useState<NudgeTone>(settings.nudgeTone);
  const [edited, setEdited] = useState<string | null>(null);

  const person = getEmployee(employeeId);
  const draft = person ? draftNudge({ to: person, fromName: profile.name, ask, due, milestoneId, tone }) : "";
  const message = edited ?? draft;
  const late = slipsPastMilestone(due, milestoneId);
  const m = getMilestone(milestoneId);
  const canSend = !!person && ask.trim().length > 3 && message.trim().length > 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSend || !person) return;
        createNudge({ employeeId, ask: ask.trim(), due, milestoneId: milestoneId || undefined, cadence, tone, message: message.trim() });
        closeNudge();
        showToast(`Nudge scheduled. Chilla is messaging ${firstName(person.name)} as you`);
      }}
    >
      <div>
        <label className="label" htmlFor="nudge-to">Who do you need something from?</label>
        <div className="flex items-center gap-2">
          {person && <Avatar name={person.name} size="sm" status={person.availability} />}
          <select id="nudge-to" className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required>
            <option value="">Pick a teammate…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} · {e.role}, {e.team}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="nudge-ask">What do you need?</label>
        <input
          id="nudge-ask"
          className="input"
          value={ask}
          onChange={(e) => setAsk(e.target.value)}
          placeholder="e.g. Share the checkout load test results"
          required
        />
      </div>

      <div>
        <p className="label">By when?</p>
        <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-1">
          {DUE_OPTIONS.map((n) => {
            const iso = toISODate(weekdayFromToday(n));
            return (
              <button
                type="button"
                key={iso}
                onClick={() => setDue(iso)}
                className={`shrink-0 rounded-lg border-[1.5px] border-ink px-2.5 py-1.5 text-sm font-semibold ${
                  due === iso ? "bg-ink text-white" : "bg-white hover:bg-belly"
                }`}
              >
                {n < 2 ? relativeDay(iso) : formatDay(iso)}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="label" htmlFor="nudge-milestone">
          Linked to a delivery milestone? <span className="font-normal text-muted">(Chilla cross-checks the timeline)</span>
        </label>
        <select id="nudge-milestone" className="input" value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
          <option value="">No milestone</option>
          {milestones.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {formatDay(milestoneDate(x.id)!)}
            </option>
          ))}
        </select>
        {m && (
          <p className={`mt-2 flex items-start gap-1.5 rounded-lg px-3 py-2 text-sm ${late ? "bg-pink-soft" : "bg-mint"}`}>
            {late ? <AlertTriangle size={15} className="mt-0.5 shrink-0" /> : <span>✓</span>}
            {late
              ? `Heads up: ${relativeDay(due)} is after ${m.name} (${formatDay(m.date)}). Pick an earlier date, or flag the risk.`
              : `${relativeDay(due)} leaves time before ${m.name} on ${formatDay(m.date)}.`}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="nudge-cadence">If there&apos;s no reply</label>
          <select id="nudge-cadence" className="input" value={cadence} onChange={(e) => setCadence(e.target.value as NudgeCadence)}>
            {(Object.keys(CADENCE_LABELS) as NudgeCadence[]).map((c) => (
              <option key={c} value={c}>{CADENCE_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <p className="label">Tone</p>
          <div className="flex gap-1.5">
            {(["friendly", "direct"] as const).map((t) => (
              <button
                type="button"
                key={t}
                onClick={() => setTone(t)}
                className={`flex-1 rounded-lg border-[1.5px] border-ink py-2 text-sm font-semibold capitalize ${
                  tone === t ? "bg-ink text-white" : "bg-white hover:bg-belly"
                }`}
              >
                {t === "friendly" ? "😊 Friendly" : "📌 Direct"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <label className="label" htmlFor="nudge-message">
            Message {person && <span className="font-normal text-muted">· sent to {firstName(person.name)} as you, via Chilla</span>}
          </label>
          {edited !== null && (
            <button type="button" className="flex items-center gap-1 text-xs font-semibold text-blue" onClick={() => setEdited(null)}>
              <RotateCcw size={12} /> Use Chilla&apos;s draft
            </button>
          )}
        </div>
        <div className="rounded-xl border-2 border-ink bg-paper p-3">
          <p className="mb-1.5 flex items-center gap-2 text-sm">
            <Avatar name={profile.name} size="sm" /> <b>{profile.name}</b>
            <span className="text-xs text-muted">sent via Chilla</span>
          </p>
          <textarea
            id="nudge-message"
            className="input min-h-24 bg-white text-[0.95rem]"
            value={message}
            onChange={(e) => setEdited(e.target.value)}
            placeholder="Pick a teammate and say what you need, and Chilla drafts this for you."
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t-2 border-dashed border-ear pt-4">
        <button type="button" className="btn btn-ghost" onClick={closeNudge}>Cancel</button>
        <button className="btn btn-blue" disabled={!canSend}>
          <BellRing size={15} /> Send nudge
        </button>
      </div>
    </form>
  );
}
