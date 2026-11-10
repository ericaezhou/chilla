"use client";

import Link from "next/link";
import { AlertTriangle, BellRing, CalendarDays, Check, Flag, MessageSquare, Search, UserRoundPen } from "lucide-react";
import { getEmployee } from "@/data/employees";
import { channels, milestones } from "@/data/workspace";
import { formatDay, formatMeetingWhen, relativeDay } from "@/lib/dates";
import { REPLY_STATUS, firstName, milestoneDate, slipsPastMilestone } from "@/lib/nudges";
import { IncomingNudgeCard } from "@/components/chat/NudgeCards";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

// Chilla's App Home tab: what needs you today, at a glance.
export function AppHome() {
  const { profile, nudges, incoming, meetings, integrations, openNudge, setModal, openProfile } = useWorkspace();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const open = incoming.filter((n) => !n.response);
  const upcoming = [...meetings].sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)).slice(0, 3);
  const waiting = nudges.filter((n) => !n.reply).length;

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-paper/50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-4xl space-y-5 pb-6">
        <section className="card bg-belly p-5">
          <h1 className="text-2xl font-black tracking-tight">
            {greeting}, {firstName(profile.name)} 👋
          </h1>
          <p className="text-muted">
            {open.length ? <><b className="text-ink">{open.length} nudge{open.length > 1 ? "s" : ""}</b> waiting on you</> : "Nothing waiting on you"}
            {" · "}
            {waiting ? <>you&apos;re waiting on <b className="text-ink">{waiting}</b></> : "no open follow-ups"}
            {" · "}
            {meetings.length} meeting{meetings.length === 1 ? "" : "s"} booked
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/" className="btn btn-sm"><Search size={14} /> Ask who knows</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => openNudge()}><BellRing size={14} /> New nudge</button>
            <Link href="/directory" className="btn btn-ghost btn-sm"><MessageSquare size={14} /> Browse directory</Link>
            <button className="btn btn-ghost btn-sm" onClick={() => setModal("profile-setup")}><UserRoundPen size={14} /> Update profile</button>
          </div>
        </section>

        {open.length > 0 && (
          <Block title="Needs your reply">
            <div className="space-y-3">{open.map((n) => <IncomingNudgeCard key={n.id} incomingId={n.id} />)}</div>
          </Block>
        )}

        <div className="grid gap-5 md:grid-cols-[1.3fr_1fr]">
          <Block title="Delivery timeline" hint="Nudges and asks, checked against each milestone">
            <ol className="relative space-y-4 border-l-2 border-dashed border-fur pl-5">
              {milestones.map((m) => {
                const date = milestoneDate(m.id)!;
                const items = [
                  ...nudges.filter((n) => n.milestoneId === m.id).map((n) => ({ id: n.id, who: n.employeeId, ask: n.ask, due: n.due, status: n.reply?.status, mine: false })),
                  ...incoming.filter((n) => n.milestoneId === m.id).map((n) => ({ id: n.id, who: n.fromId, ask: n.ask, due: n.response?.newDue ?? n.due, status: n.response?.status, mine: true })),
                ];
                const atRisk = items.some((i) => slipsPastMilestone(i.due, m.id) || i.status === "blocked");
                return (
                  <li key={m.id}>
                    <span className={`absolute -left-[9px] mt-1 grid h-4 w-4 place-items-center rounded-full border-2 border-ink ${atRisk ? "bg-nose" : "bg-white"}`} />
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      <Flag size={14} /> {m.name}
                      <span className="text-sm font-semibold text-muted">{formatDay(date)}</span>
                      {atRisk && <span className="pill bg-pink-soft"><AlertTriangle size={11} /> at risk</span>}
                    </p>
                    {items.length ? (
                      <ul className="mt-1.5 space-y-1 text-sm">
                        {items.map((i) => {
                          const person = getEmployee(i.who);
                          const late = slipsPastMilestone(i.due, m.id);
                          return (
                            <li key={i.id} className="flex flex-wrap items-center gap-1.5">
                              <span className={late ? "font-semibold text-[#b4423f]" : ""}>
                                {i.mine ? "You → " : ""}
                                {i.ask}
                              </span>
                              <span className="text-muted">
                                · {i.mine ? `for ${firstName(person?.name ?? "")}` : firstName(person?.name ?? "")} · due {relativeDay(i.due)}
                              </span>
                              {i.status && <span className={`pill ${REPLY_STATUS[i.status].cls}`}>{REPLY_STATUS[i.status].emoji} {REPLY_STATUS[i.status].label}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="mt-1 text-sm text-muted">Nothing linked yet.</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Block>

          <div className="space-y-5">
            <Block title="Upcoming meetings">
              {upcoming.length ? (
                <ul className="space-y-2">
                  {upcoming.map((m) => {
                    const e = getEmployee(m.employeeId);
                    if (!e) return null;
                    return (
                      <li key={m.id}>
                        <button className="flex w-full items-center gap-2 text-left" onClick={() => openProfile(e.id)}>
                          <Avatar name={e.name} size="sm" />
                          <span className="min-w-0 flex-1 text-sm">
                            <b>{e.name}</b>
                            <span className="block text-muted">{formatMeetingWhen(m.date, m.time)} · {m.duration}m</span>
                          </span>
                          <span className={`pill ${m.status === "accepted" ? "bg-mint" : "bg-yellow"}`}>{m.status === "accepted" ? "Accepted" : "Pending"}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-muted">None yet. Ask Chilla who to talk to, then book from a result.</p>
              )}
            </Block>

            <Block title="Connected">
              <ul className="space-y-2 text-sm">
                <Connected ok label="Slack" detail={`In ${integrations.channels.length ? integrations.channels.map((c) => `#${channels.find((x) => x.slug === c)?.name ?? c}`).join(", ") : "your DMs only"}`} />
                <Connected
                  ok={!!integrations.calendar}
                  label={integrations.calendar === "outlook" ? "Outlook Calendar" : "Google Calendar"}
                  detail={integrations.calendar ? "Free/busy only" : "Not connected"}
                  action={!integrations.calendar ? <button className="btn btn-ghost btn-sm" onClick={() => setModal("calendar")}>Connect</button> : undefined}
                />
                <Connected ok={false} label="Microsoft Teams" detail="Coming soon" />
              </ul>
            </Block>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card-flat p-4 sm:p-5">
      <h2 className="text-xs font-bold tracking-wider text-muted uppercase">{title}</h2>
      {hint && <p className="mb-3 text-xs text-muted">{hint}</p>}
      <div className={hint ? "" : "mt-3"}>{children}</div>
    </section>
  );
}

function Connected({ ok, label, detail, action }: { ok: boolean; label: string; detail: string; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`grid h-6 w-6 place-items-center rounded-full border-[1.5px] border-ink ${ok ? "bg-mint" : "bg-belly"}`}>
        {ok ? <Check size={13} strokeWidth={3} /> : <CalendarDays size={12} />}
      </span>
      <span className="min-w-0 flex-1">
        <b>{label}</b> <span className="text-muted">· {detail}</span>
      </span>
      {action}
    </li>
  );
}
