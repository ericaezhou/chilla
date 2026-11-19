"use client";

import { Bookmark, CalendarPlus, Eye, MessageSquareText, Search, SmilePlus } from "lucide-react";
import { getEmployee } from "@/data/employees";
import type { ChatMessage } from "@/lib/types";
import { formatTime } from "@/lib/dates";
import { Avatar } from "@/components/ui/Avatar";
import { ChillaAvatar } from "@/components/ui/Mascot";
import { RichText } from "@/components/ui/RichText";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { IncomingNudgeCard, NudgeCard } from "./NudgeCards";
import { MeetingNotice } from "./MeetingNotice";
import { RecommendationCard } from "./RecommendationCard";
import { RefineBar } from "./RefineBar";
import { SetupCard } from "./SetupCard";

const QUICK_REACTIONS = ["👍", "🎉", "👀", "✅"];

export function Message({ msg, convId }: { msg: ChatMessage; convId: string }) {
  const { profile, openProfile, reactions, toggleReaction, showToast, runAction, typing } = useWorkspace();

  if (msg.kind === "system") {
    return (
      <p className={`flex items-center gap-2 px-4 py-1.5 text-sm text-muted sm:px-5 ${msg.ephemeral ? "italic" : ""}`}>
        <span className="grid h-5 w-9 shrink-0 place-items-center text-xs">→</span>
        <span>
          <RichText text={msg.text} />
          {msg.ephemeral && <EphemeralTag />}
        </span>
      </p>
    );
  }

  const employee = msg.author !== "me" && msg.author !== "chilla" ? getEmployee(msg.author) : undefined;
  const name = msg.author === "me" ? profile.name : msg.author === "chilla" ? "Chilla" : (employee?.name ?? "Someone");
  const mine = reactions[msg.id] ?? [];

  return (
    <div
      className={`group relative flex animate-pop gap-3 px-4 py-2 hover:bg-paper/60 sm:px-5 ${
        msg.ephemeral ? "border-l-4 border-ear bg-belly/40" : ""
      }`}
    >
      {/* Slack's hover toolbar */}
      <div className="absolute -top-3 right-4 z-10 hidden items-center rounded-lg border-[1.5px] border-ink bg-white shadow-brutal-sm group-hover:flex group-focus-within:flex">
        {QUICK_REACTIONS.map((e) => (
          <button key={e} className="px-1.5 py-1 hover:bg-belly" onClick={() => toggleReaction(msg.id, e)} aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
        <span className="h-5 w-px bg-ear" />
        <ToolbarButton label="Add reaction" onClick={() => toggleReaction(msg.id, "🙌")}><SmilePlus size={15} /></ToolbarButton>
        <ToolbarButton label="Reply in thread" onClick={() => showToast("Threads aren't part of this demo 🧵")}><MessageSquareText size={15} /></ToolbarButton>
        <ToolbarButton label="Save for later" onClick={() => showToast("Saved for later 🔖")}><Bookmark size={15} /></ToolbarButton>
      </div>

      {msg.author === "chilla" ? (
        <ChillaAvatar />
      ) : employee ? (
        <button onClick={() => openProfile(employee.id)} aria-label={`Open ${employee.name}'s profile`}>
          <Avatar name={employee.name} />
        </button>
      ) : (
        <Avatar name={name} />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2">
          {employee ? (
            <button className="font-bold hover:underline" onClick={() => openProfile(employee.id)}>
              {name}
            </button>
          ) : (
            <b>{name}</b>
          )}
          {msg.author === "chilla" && <span className="rounded bg-ear px-1.5 text-[0.6rem] font-bold">APP</span>}
          <time className="text-xs text-muted" suppressHydrationWarning>{formatTime(msg.ts)}</time>
          {msg.kind === "text" && msg.via && <span className="text-xs text-muted">· sent via Chilla</span>}
          {msg.ephemeral && <EphemeralTag />}
        </p>

        {msg.kind === "text" && (
          <p className="text-[0.97rem] leading-relaxed whitespace-pre-wrap">
            <RichText text={msg.text} />
          </p>
        )}
        {msg.kind === "text" && msg.actions && msg.actions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {msg.actions.map((a) => (
              <button
                key={a.label}
                className="btn btn-ghost btn-sm"
                disabled={!!typing[convId]}
                onClick={() => runAction(convId, a, msg.ephemeral)}
              >
                {a.type === "meet" ? <CalendarPlus size={14} /> : <Search size={14} />} {a.label}
              </button>
            ))}
          </div>
        )}

        {msg.kind === "meeting" && <MeetingNotice meetingId={msg.meetingId} />}
        {msg.kind === "nudge" && <NudgeCard nudgeId={msg.nudgeId} />}
        {msg.kind === "incoming-nudge" && <IncomingNudgeCard incomingId={msg.incomingId} />}
        {msg.kind === "setup" && <SetupCard />}

        {msg.kind === "recommendations" && (
          <div className="mt-0.5">
            <p className="text-[0.97rem] leading-relaxed">
              {msg.intro ? (
                <RichText text={msg.intro} />
              ) : msg.results.length > 1 ? (
                <>
                  Here are the <b>{msg.results.length} people</b> who know the most about{" "}
                  <span className="font-semibold">{msg.topic}</span>, ranked by how closely their work matches:
                </>
              ) : (
                <>
                  I found one person who clearly works on <span className="font-semibold">{msg.topic}</span>:
                </>
              )}
            </p>
            {msg.notes && msg.notes.length > 0 && (
              <ul className="mt-2 max-w-2xl space-y-1.5 text-[0.95rem]">
                {msg.notes.map((n) => (
                  <li key={n} className="relative pl-4 before:absolute before:top-[0.65em] before:left-0 before:h-1.5 before:w-1.5 before:rounded-full before:bg-nose">
                    <RichText text={n} />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 grid max-w-2xl grid-cols-[minmax(0,1fr)] gap-4">
              {msg.results.map((r, i) => (
                <RecommendationCard
                  key={r.employeeId}
                  rec={r}
                  rank={i + 1}
                  query={msg.query}
                  topic={msg.topic}
                  ranked={!msg.noRefine}
                />
              ))}
            </div>
            {!msg.noRefine && <RefineBar msg={msg} convId={convId} />}
          </div>
        )}

        {mine.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {mine.map((e) => (
              <button
                key={e}
                onClick={() => toggleReaction(msg.id, e)}
                className="flex items-center gap-1 rounded-full border-[1.5px] border-blue bg-blue-soft px-2 py-px text-sm font-semibold text-blue"
                aria-label={`Remove ${e} reaction`}
              >
                {e} <span className="text-xs">1</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className="px-1.5 py-1.5 text-muted hover:bg-belly hover:text-ink" onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function EphemeralTag() {
  return (
    <span className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-muted not-italic">
      <Eye size={12} /> Only visible to you
    </span>
  );
}

/** "Chilla is checking…" or "Dev is typing…" */
export function TypingIndicator({ who }: { who: string }) {
  const person = who === "chilla" ? undefined : getEmployee(who);
  return (
    <div className="flex items-center gap-3 px-4 py-2 sm:px-5" aria-live="polite">
      {person ? <Avatar name={person.name} /> : <ChillaAvatar />}
      <div className="flex items-center gap-2 text-sm text-muted">
        <span className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 animate-bounce-dot rounded-full bg-fur" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
        {person ? `${person.name.split(" ")[0]} is typing…` : "Chilla is checking who's worked on this…"}
      </div>
    </div>
  );
}
