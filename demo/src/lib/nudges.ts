import { defaultNudgeReply, milestones, nudgeReplies } from "@/data/workspace";
import type { Employee, NudgeCadence, NudgeReplyStatus, NudgeTone } from "@/lib/types";
import { relativeDay, toISODate, weekdayFromToday } from "./dates";

// Nudge helpers: draft the message, cross-check the delivery timeline and
// describe statuses. Pure functions; timing lives in WorkspaceProvider.

export const firstName = (name: string) => name.split(" ")[0];

export function milestoneDate(id?: string) {
  const m = milestones.find((x) => x.id === id);
  return m ? toISODate(weekdayFromToday(m.inWeekdays)) : undefined;
}

export function getMilestone(id?: string) {
  const m = milestones.find((x) => x.id === id);
  return m && { ...m, date: milestoneDate(m.id)! };
}

/** Is the due date later than the milestone it's supposed to unblock? */
export function slipsPastMilestone(due: string, milestoneId?: string) {
  const date = milestoneDate(milestoneId);
  return !!date && due > date;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export function draftNudge(opts: {
  to: Employee;
  fromName: string;
  ask: string;
  due: string;
  milestoneId?: string;
  tone: NudgeTone;
}) {
  const first = firstName(opts.to.name);
  const ask = lowerFirst(opts.ask.trim().replace(/[.?!]+$/, "")) || "the thing we discussed";
  const when = relativeDay(opts.due);
  const m = getMilestone(opts.milestoneId);
  const why = m ? ` so we stay on track for ${m.name} (${relativeDay(m.date)})` : "";
  return opts.tone === "friendly"
    ? `Hi ${first}! 👋 Quick check-in from ${firstName(opts.fromName)}: could you ${ask} by ${when}${why}? If anything's blocking you, just reply here 🙏`
    : `Hi ${first}, following up: I need you to ${ask} by ${when}${why}. Can you confirm you're on track?`;
}

export function replyFor(employeeId: string, due: string) {
  const r = nudgeReplies[employeeId] ?? defaultNudgeReply;
  return { status: r.status, text: r.text.replace("{due}", relativeDay(due)) };
}

export const CADENCE_LABELS: Record<NudgeCadence, string> = {
  once: "Just once",
  "before-due": "Again the day before it's due",
  daily: "Every morning until it's done",
};

export const REPLY_STATUS: Record<NudgeReplyStatus, { label: string; emoji: string; cls: string }> = {
  done: { label: "Done", emoji: "✅", cls: "bg-mint" },
  "on-track": { label: "On track", emoji: "👍", cls: "bg-blue-soft" },
  "need-time": { label: "Needs more time", emoji: "🕐", cls: "bg-yellow" },
  blocked: { label: "Blocked", emoji: "🚧", cls: "bg-pink-soft" },
};

/** When Chilla would follow up next if there's no reply. */
export function nextFollowUp(cadence: NudgeCadence, due: string) {
  if (cadence === "once") return null;
  if (cadence === "daily") return "tomorrow 9:00am";
  const d = new Date(`${due}T09:00:00`);
  d.setDate(d.getDate() - 1);
  return `${relativeDay(toISODate(d))} 9:00am`;
}
