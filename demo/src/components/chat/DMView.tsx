"use client";

import { BellRing, CalendarPlus, UserRound } from "lucide-react";
import { getEmployee } from "@/data/employees";
import { dmId } from "@/lib/chilla";
import { firstName } from "@/lib/nudges";
import { Avatar, statusLabel } from "@/components/ui/Avatar";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { ChatView } from "./ChatView";

// A direct message with a colleague. Nudges Chilla sends as you land here too.
export function DMView({ employeeId }: { employeeId: string }) {
  const { openProfile, openMeeting, openNudge, integrations, settings } = useWorkspace();
  const e = getEmployee(employeeId);
  if (!e) return null;
  const first = firstName(e.name);

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b-2 border-ink px-4 py-3 sm:px-5">
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => openProfile(e.id)}>
          <Avatar name={e.name} status={settings.showAvailability ? e.availability : undefined} />
          <span className="min-w-0">
            <span className="block text-lg leading-tight font-extrabold hover:underline">{e.name}</span>
            <span className="block truncate text-xs text-muted">
              {e.role} · {e.team}
              {settings.showAvailability && ` · ${statusLabel(e.availability)}`}
            </span>
          </span>
        </button>
        {integrations.slack && (
          <div className="flex gap-1.5">
            <button className="btn btn-ghost btn-sm" onClick={() => openMeeting(e.id)} aria-label={`Schedule with ${first}`}>
              <CalendarPlus size={14} /> <span className="hidden sm:inline">Schedule</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => openNudge({ employeeId: e.id })} aria-label={`Nudge ${first}`}>
              <BellRing size={14} /> <span className="hidden sm:inline">Nudge</span>
            </button>
          </div>
        )}
      </div>
      <ChatView
        key={e.id}
        convId={dmId(e.id)}
        suggestions={false}
        placeholder={`Message ${e.name}`}
        intro={
          <div className="px-4 pt-4 pb-2 sm:px-5">
            <Avatar name={e.name} size="xl" />
            <p className="mt-3 text-xl font-black tracking-tight">{e.name}</p>
            <p className="text-sm text-muted">{e.role} · {e.team}</p>
            <p className="mt-2 text-sm">
              This conversation is just between you and <b>{first}</b>.{" "}
              <button className="font-semibold text-blue hover:underline" onClick={() => openProfile(e.id)}>
                <UserRound size={13} className="mr-0.5 inline" />
                View profile
              </button>
            </p>
          </div>
        }
      />
    </>
  );
}
