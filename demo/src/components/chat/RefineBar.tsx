"use client";

import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { departments } from "@/data/employees";
import type { ChatMessage, Department, SearchFilters } from "@/lib/types";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

type Recs = Extract<ChatMessage, { kind: "recommendations" }>;

// Block Kit-style buttons under a recommendation: narrow by team or
// availability, or ask for different people. Each click posts a new answer.
export function RefineBar({ msg, convId }: { msg: Recs; convId: string }) {
  const { refineSearch, typing } = useWorkspace();
  const f = msg.filters ?? {};
  const busy = !!typing[convId];
  const run = (next: SearchFilters) => refineSearch(convId, msg.query, next, msg.ephemeral);

  const active = [f.department, f.availableOnly && "available now", f.excludeIds?.length && "new people"].filter(Boolean);

  return (
    <div className="mt-4 max-w-2xl rounded-xl border-[1.5px] border-dashed border-fur bg-paper/70 p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
        <SlidersHorizontal size={13} /> Narrow it down
        {active.length > 0 && <span className="font-semibold normal-case">· filtered to {active.join(", ")}</span>}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {departments.map((d: Department) => (
          <button
            key={d}
            disabled={busy}
            onClick={() => run({ ...f, excludeIds: undefined, department: f.department === d ? undefined : d })}
            className={`chip ${f.department === d ? "bg-ink text-white" : "bg-white hover:bg-blue-soft"}`}
            aria-pressed={f.department === d}
          >
            {d}
          </button>
        ))}
        <button
          disabled={busy}
          onClick={() => run({ ...f, excludeIds: undefined, availableOnly: !f.availableOnly })}
          className={`chip ${f.availableOnly ? "bg-ink text-white" : "bg-white hover:bg-blue-soft"}`}
          aria-pressed={!!f.availableOnly}
        >
          <span className="h-2 w-2 rounded-full border border-ink bg-green" /> Available now
        </button>
        <button
          disabled={busy}
          onClick={() => run({ ...f, excludeIds: [...(f.excludeIds ?? []), ...msg.results.map((r) => r.employeeId)] })}
          className="chip bg-white hover:bg-blue-soft"
        >
          <RefreshCw size={12} /> Show other people
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">Based on projects, skills and expertise in Fernway profiles.</p>
    </div>
  );
}
