"use client";

import { CalendarDays, Check, MessageCircleQuestion, UserRoundPen } from "lucide-react";
import type { ReactNode } from "react";
import { tourScenario } from "@/data/workspace";
import { CHILLA_DM } from "@/lib/chilla";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

// The getting-started checklist Chilla posts right after install.
// It reads live state, so items tick off as you complete them anywhere.
export function SetupCard() {
  const { integrations, onboarded, events, setModal, sendMessage } = useWorkspace();
  const asked = events.includes("search");
  const calendar = integrations.calendar === "google" ? "Google Calendar" : integrations.calendar === "outlook" ? "Outlook" : null;

  return (
    <div className="card-flat mt-2 max-w-xl overflow-hidden shadow-brutal-sm">
      <p className="border-b-[1.5px] border-ink bg-belly px-4 py-2.5 font-extrabold">Let&apos;s get you set up (about 1 minute)</p>
      <ul className="divide-y-[1.5px] divide-dashed divide-ear">
        <Item
          icon={<CalendarDays size={17} />}
          done={!!calendar}
          title={calendar ? `${calendar} connected` : "Connect your calendar"}
          body="So I can find times you and a teammate are both free. Free/busy only."
        >
          <button className="btn btn-sm" onClick={() => setModal("calendar")} data-tour="connect-calendar">
            Connect
          </button>
        </Item>
        <Item
          icon={<UserRoundPen size={17} />}
          done={onboarded}
          title={onboarded ? "Profile is live" : "Fill out your profile"}
          body="Tell people what you work on so they can find you. I pre-filled it from Slack."
        >
          <button className="btn btn-sm" onClick={() => setModal("profile-setup")} data-tour="setup-profile">
            Set up profile
          </button>
        </Item>
        <Item
          icon={<MessageCircleQuestion size={17} />}
          done={asked}
          title="Ask your first question"
          body="Type below in plain English, or try this one:"
        >
          <button className="chip bg-white text-left hover:bg-blue-soft" onClick={() => sendMessage(CHILLA_DM, tourScenario.query)}>
            {tourScenario.query}
          </button>
        </Item>
      </ul>
    </div>
  );
}

function Item({ icon, done, title, body, children }: { icon: ReactNode; done: boolean; title: string; body: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-[1.5px] border-ink ${done ? "bg-mint" : "bg-white"}`}>
        {done ? <Check size={16} strokeWidth={3} /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-bold ${done ? "text-muted line-through" : ""}`}>{title}</p>
        {!done && <p className="text-sm text-muted">{body}</p>}
      </div>
      {!done && <div className="sm:shrink-0">{children}</div>}
    </li>
  );
}
