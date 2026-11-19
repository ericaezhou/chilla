import type { IncomingNudge, Integrations, MeetingRequest, Nudge } from "@/lib/types";

// The guided first run. A step is complete when the app state says the user
// actually did it, so the tour never needs a "Next" button and can't drift.
// `target` matches a data-tour="…" attribute that TourGuide highlights.

export type TourEvent = "directory-profile" | "search" | "intro";

export interface TourSnapshot {
  integrations: Integrations;
  onboarded: boolean;
  events: TourEvent[];
  meetings: MeetingRequest[];
  nudges: Nudge[];
  incoming: IncomingNudge[];
}

export interface TourStep {
  id: string;
  title: string;
  body: string;
  /** Where "Take me there" goes. */
  href: string;
  target: string;
  done: (s: TourSnapshot) => boolean;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "install",
    title: "Add Chilla to your Slack",
    body: "Your company admin approved Chilla. Click **Add to Slack**, review what it can access, and pick the channels it should join.",
    href: "/apps",
    target: "install",
    done: (s) => s.integrations.slack,
  },
  {
    id: "calendar",
    title: "Connect your calendar",
    body: "Chilla only reads **free/busy** so it can find times you and a teammate are both open. Hit **Connect** in Chilla's welcome message.",
    href: "/",
    target: "connect-calendar",
    done: (s) => !!s.integrations.calendar,
  },
  {
    id: "profile",
    title: "Fill out your profile",
    body: "This is how teammates find **you**. Chilla pre-filled it from Slack. Add what you work on and save.",
    href: "/",
    target: "setup-profile",
    done: (s) => s.onboarded,
  },
  {
    id: "directory",
    title: "Browse the directory",
    body: "Everyone's profile lives in the **Directory** tab. Filter by team, skill or project, then open someone's profile.",
    href: "/directory",
    target: "directory-card",
    done: (s) => s.events.includes("directory-profile"),
  },
  {
    id: "search",
    title: "Ask who to talk to",
    body: "Ask Chilla a question in plain English. You'll get the top people, **why** each was picked, and filters to narrow it down.",
    href: "/",
    target: "composer",
    done: (s) => s.events.includes("search"),
  },
  {
    id: "meeting",
    title: "Book time, both calendars synced",
    body: "Hit **Request meeting** on your top match. Chilla compares your calendar with theirs and suggests a slot you're both free.",
    href: "/",
    target: "request-meeting",
    done: (s) => s.meetings.length > 0,
  },
  {
    id: "nudge",
    title: "Nudge a cross-functional POC",
    body: "Need something from another team by a date? Chilla follows up **on your behalf** and checks it against the launch timeline.",
    href: "/nudges",
    target: "new-nudge",
    done: (s) => s.nudges.length > 0,
  },
  {
    id: "respond",
    title: "Respond to a nudge",
    body: "Nudges go both ways. A teammate's Chilla just checked in with **you**. Answer in one click from the message.",
    href: "/",
    target: "respond-nudge",
    done: (s) => s.incoming.some((n) => n.response),
  },
];

export function tourProgress(s: TourSnapshot) {
  const doneCount = TOUR_STEPS.filter((t) => t.done(s)).length;
  const current = TOUR_STEPS.find((t) => !t.done(s)) ?? null;
  return { doneCount, current, total: TOUR_STEPS.length, finished: !current };
}
