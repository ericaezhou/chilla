"use client";

import { BellRing, Inbox, Send } from "lucide-react";
import { IncomingNudgeCard, NudgeCard } from "@/components/chat/NudgeCards";
import { Mascot } from "@/components/ui/Mascot";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

// The Nudges tab: what you're waiting on, and what others are waiting on from you.
export function NudgesView() {
  const { nudges, incoming, openNudge } = useWorkspace();
  const open = incoming.filter((n) => !n.response);
  const answered = incoming.filter((n) => n.response);

  return (
    <div className="scroll-thin min-h-0 flex-1 overflow-y-auto bg-paper/50 px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6 pb-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Nudges</h1>
            <p className="text-sm text-muted">Chilla follows up for you, so you don&apos;t have to chase.</p>
          </div>
          <button className="btn btn-blue" onClick={() => openNudge()} data-tour="new-nudge">
            <BellRing size={15} /> New nudge
          </button>
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-extrabold">
            <Inbox size={17} /> Waiting on you <span className="text-sm font-semibold text-muted">({open.length})</span>
          </h2>
          {open.length ? (
            <div className="space-y-3">{open.map((n) => <IncomingNudgeCard key={n.id} incomingId={n.id} />)}</div>
          ) : (
            <p className="rounded-xl border-2 border-dashed border-ear px-4 py-3 text-sm text-muted">Nobody&apos;s waiting on you right now. 🧘</p>
          )}
        </section>

        <section>
          <h2 className="mb-2 flex items-center gap-2 font-extrabold">
            <Send size={16} /> You&apos;re waiting on <span className="text-sm font-semibold text-muted">({nudges.length})</span>
          </h2>
          {nudges.length ? (
            <div className="space-y-3">{nudges.map((n) => <NudgeCard key={n.id} nudgeId={n.id} />)}</div>
          ) : (
            <div className="card flex flex-col items-center p-6 text-center">
              <Mascot className="h-20 w-20" />
              <p className="mt-2 font-bold">No nudges yet</p>
              <p className="max-w-sm text-sm text-muted">
                Need something from another team by a date? Chilla messages them as you, follows up if they go quiet, and tells you when they reply.
              </p>
              <button className="btn mt-3" onClick={() => openNudge()}>Create your first nudge</button>
            </div>
          )}
        </section>

        {answered.length > 0 && (
          <section>
            <h2 className="mb-2 font-extrabold text-muted">Answered</h2>
            <div className="space-y-3 opacity-80">{answered.map((n) => <IncomingNudgeCard key={n.id} incomingId={n.id} />)}</div>
          </section>
        )}
      </div>
    </div>
  );
}
