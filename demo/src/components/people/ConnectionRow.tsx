"use client";

import { Handshake, Route, UserRoundX } from "lucide-react";
import { getEmployee } from "@/data/employees";
import { connectionTo, degreeLabel } from "@/lib/network";
import { Avatar } from "@/components/ui/Avatar";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

const DEGREE_STYLE = {
  1: "bg-mint",
  2: "bg-blue-soft",
  3: "bg-yellow",
} as const;

/** Small "2nd" pill for directory cards. */
export function DegreeBadge({ employeeId }: { employeeId: string }) {
  const c = connectionTo(employeeId);
  if (!c.degree) return null;
  return (
    <span className={`pill ${DEGREE_STYLE[c.degree]}`} title="Degrees of separation from you">
      {degreeLabel(c.degree)}
    </span>
  );
}

// How you're connected to someone, and who can give you a warm intro.
export function ConnectionRow({ employeeId, topic, compact }: { employeeId: string; topic?: string; compact?: boolean }) {
  const { requestIntro } = useWorkspace();
  const e = getEmployee(employeeId);
  if (!e) return null;
  const c = connectionTo(employeeId);
  const first = e.name.split(" ")[0];
  const shown = c.mutuals.slice(0, compact ? 2 : 3);

  return (
    <div className="rounded-lg border-[1.5px] border-dashed border-fur bg-paper/70 px-3 py-2 text-sm">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {c.degree ? <Handshake size={15} className="shrink-0" /> : <UserRoundX size={15} className="shrink-0" />}
        {c.degree && <span className={`pill ${DEGREE_STYLE[c.degree]}`}>{degreeLabel(c.degree)} degree</span>}
        <span className="font-semibold">
          {c.degree === 1 && "You've worked together"}
          {c.degree === 2 && `${shown.length === 1 ? "1 mutual contact" : `${c.mutuals.length} mutual contacts`}`}
          {c.degree === 3 && "Two people away"}
          {c.degree === null && "No mutual contacts yet"}
        </span>
      </p>

      {c.degree === 1 && <p className="mt-1 text-muted">You {c.how}. A direct message should feel natural.</p>}

      {c.degree === 2 && (
        <ul className="mt-1.5 space-y-1.5">
          {shown.map((m) => (
            <li key={m.via.id} className="flex flex-wrap items-center gap-2">
              <Avatar name={m.via.name} size="sm" />
              <span className="min-w-0 flex-1 basis-48 text-muted">
                <b className="text-ink">{m.via.name}</b> and {first} {m.how}.
              </span>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => requestIntro(m.via.id, e.id, topic)}
                aria-label={`Ask ${m.via.name} to introduce you to ${e.name}`}
              >
                Ask {m.via.name.split(" ")[0]} for an intro
              </button>
            </li>
          ))}
        </ul>
      )}

      {c.degree === 3 && c.path && (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="flex min-w-0 flex-1 basis-48 items-center gap-1.5 text-muted">
            <Route size={14} className="shrink-0" />
            <span>
              You → <b className="text-ink">{c.path[0].name}</b> → <b className="text-ink">{c.path[1].name}</b> → {first}
            </span>
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => requestIntro(c.path![0].id, e.id, topic, c.path![1].id)}
            aria-label={`Ask ${c.path[0].name} to help you reach ${e.name}`}
          >
            Ask {c.path[0].name.split(" ")[0]} to connect you
          </button>
        </div>
      )}

      {c.degree === null && (
        <p className="mt-1 text-muted">Reach out directly. Chilla&apos;s intro note explains why you&apos;re getting in touch.</p>
      )}
    </div>
  );
}
