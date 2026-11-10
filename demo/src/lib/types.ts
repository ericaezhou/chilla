// Shared domain types. Mock data in src/data/ and all UI components use these.

export type Department =
  | "Product"
  | "Engineering"
  | "Design"
  | "Marketing"
  | "Operations";

export type ProjectStatus = "current" | "past";

export interface Project {
  name: string;
  status: ProjectStatus;
  period: string;
  role: string;
  summary: string;
  tags: string[];
}

export interface Experience {
  title: string;
  company: string;
  period: string;
}

export interface Employee {
  id: string;
  name: string;
  pronouns?: string;
  role: string;
  department: Department;
  team: string;
  location: string;
  timezone: string;
  email: string;
  slack: string;
  tenure: string;
  bio: string;
  skills: string[];
  expertise: string[];
  projects: Project[];
  experience: Experience[];
  /** One line describing what kinds of questions to bring this person. */
  bestFor: string;
  availability: "available" | "busy" | "away";
}

export interface UserProfile {
  name: string;
  role: string;
  department: Department;
  team: string;
  location: string;
  email: string;
  bio: string;
  skills: string[];
  projects: Project[];
  experience: Experience[];
  /** "Ask me about…" line shown on your card, like Employee.bestFor. */
  bestFor?: string;
}

export interface MeetingRequest {
  id: string;
  employeeId: string;
  date: string; // yyyy-mm-dd
  time: string; // "10:30"
  duration: number;
  format: "video" | "in-person";
  purpose: string;
  shareContext: boolean;
  createdAt: string;
  status: "pending" | "accepted";
  /** True when it was booked against your synced calendar. */
  onCalendar?: boolean;
}

export type CalendarProvider = "google" | "outlook";

/** What has been connected during onboarding. */
export interface Integrations {
  slack: boolean;
  /** Channels Chilla was added to at install time. */
  channels: string[];
  calendar: CalendarProvider | null;
}

// ---------- nudges ----------

export type NudgeTone = "friendly" | "direct";
export type NudgeCadence = "once" | "daily" | "before-due";
export type NudgeReplyStatus = "done" | "on-track" | "need-time" | "blocked";

/** A nudge you asked Chilla to send to someone on your behalf. */
export interface Nudge {
  id: string;
  employeeId: string;
  ask: string;
  due: string; // yyyy-mm-dd
  milestoneId?: string;
  cadence: NudgeCadence;
  tone: NudgeTone;
  message: string;
  createdAt: string;
  status: "sending" | "sent" | "replied";
  reply?: { status: NudgeReplyStatus; text: string; at: string };
}

/** A nudge a teammate's Chilla sent to you. */
export interface IncomingNudge {
  id: string;
  fromId: string;
  ask: string;
  due: string;
  milestoneId?: string;
  createdAt: string;
  response?: { status: NudgeReplyStatus; note?: string; newDue?: string; at: string };
}

export interface Milestone {
  id: string;
  name: string;
  /** Weekdays from today, so the timeline always looks current. */
  inWeekdays: number;
}

export interface Settings {
  discoverable: boolean;
  showAvailability: boolean;
  defaultDuration: number;
  defaultFormat: "video" | "in-person";
  workingHoursStart: string;
  workingHoursEnd: string;
  resultCount: 2 | 3;
  dmNotifications: boolean;
  weeklyDigest: boolean;
  nudgeTone: NudgeTone;
  nudgeCadence: NudgeCadence;
}

// ---------- chat ----------

export interface Recommendation {
  employeeId: string;
  relevance: number; // 0–100
  reasons: string[];
  matchedTerms: string[];
}

export interface SearchFilters {
  department?: Department;
  availableOnly?: boolean;
  /** People already shown, for "show other people". */
  excludeIds?: string[];
}

interface BaseMessage {
  id: string;
  ts: string;
  /** Slash-command replies are only visible to you, like in real Slack. */
  ephemeral?: boolean;
}

export type ChatMessage =
  | (BaseMessage & {
      kind: "text";
      author: string; // "me" | "chilla" | employee id
      text: string;
      /** Sent by Chilla on your behalf (nudges). */
      via?: "chilla";
    })
  | (BaseMessage & {
      kind: "recommendations";
      author: "chilla";
      query: string;
      topic: string;
      results: Recommendation[];
      filters?: SearchFilters;
    })
  | (BaseMessage & { kind: "meeting"; author: "chilla"; meetingId: string })
  | (BaseMessage & { kind: "nudge"; author: "chilla"; nudgeId: string })
  | (BaseMessage & { kind: "incoming-nudge"; author: "chilla"; incomingId: string })
  /** The getting-started checklist Chilla posts right after install. */
  | (BaseMessage & { kind: "setup"; author: "chilla" })
  /** Slack system lines like "Chilla joined #launch-q4". */
  | (BaseMessage & { kind: "system"; author: "system"; text: string });
