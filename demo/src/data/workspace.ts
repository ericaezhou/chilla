import type { ChatMessage, IncomingNudge, Milestone, NudgeReplyStatus, Settings, UserProfile } from "@/lib/types";

// Workspace-level mock content: company, channels, seeded messages, prompts
// and the defaults used before anything is saved to localStorage.

export const company = {
  name: "Fernway",
  domain: "fernway.com",
};

export const suggestedPrompts = [
  "Who should I talk to about our payments integration?",
  "Who knows the SSO migration?",
  "Who decided the EU pricing change?",
  "I need legal sign-off on data retention for exports",
  "Who can help me run user interviews with finance admins?",
  "Who's running load tests before the Q4 launch?",
];

export interface Channel {
  slug: string;
  name: string;
  topic: string;
  members: number;
}

export const channels: Channel[] = [
  { slug: "launch-q4", name: "launch-q4", topic: "Q4 Checkout & Payouts launch · Nov 12", members: 24 },
  { slug: "payments-squad", name: "payments-squad", topic: "Payments Platform day-to-day", members: 11 },
  { slug: "general", name: "general", topic: "Company-wide announcements", members: 312 },
];

/** Messages shown the first time a channel is opened. Authors are employee ids. */
export const seededChannelMessages: Record<string, ChatMessage[]> = {
  "launch-q4": [
    {
      id: "seed-l1",
      kind: "text",
      author: "chloe-dubois",
      ts: "2026-11-01T17:12:00.000Z",
      text: "Launch tiering doc is final 🎉 We're Tier 1 for **Nov 12**. Please flag any blockers here.",
    },
    {
      id: "seed-l2",
      kind: "text",
      author: "dev-patel",
      ts: "2026-11-01T17:40:00.000Z",
      text: "Load test for checkout at 5× peak is running tonight. Will post results here.",
    },
    {
      id: "seed-l3",
      kind: "text",
      author: "maya-chen",
      ts: "2026-11-01T18:05:00.000Z",
      text: "Reminder: anything touching data exports needs a consent banner. Not sure who signs off on the wording though 🤔",
    },
  ],
  "payments-squad": [
    {
      id: "seed-p1",
      kind: "text",
      author: "priya-raman",
      ts: "2026-11-01T16:30:00.000Z",
      text: "Adyen failover is live in staging. `retry-worker` changes ship tomorrow.",
    },
    {
      id: "seed-p2",
      kind: "text",
      author: "kenji-watanabe",
      ts: "2026-11-01T16:52:00.000Z",
      text: "Fraud scoring latency is p99 42ms after the feature store change 🚀",
    },
  ],
  general: [
    {
      id: "seed-g1",
      kind: "text",
      author: "tom-becker",
      ts: "2026-10-31T23:00:00.000Z",
      text: "October Voice of Customer report is out. Top driver this month is failed payment notifications.",
    },
    {
      id: "seed-g2",
      kind: "text",
      author: "omar-haddad",
      ts: "2026-11-01T15:45:00.000Z",
      text: "Happy Monday all ☕ New onboarding emails go live this week.",
    },
  ],
};

/** People pinned under "Direct messages" in the sidebar. */
export const sidebarDMs = ["dev-patel", "isabel-torres", "priya-raman", "maya-chen", "grace-liu"];

/**
 * What Chilla can read from your Slack profile at install time. Onboarding
 * starts from this and asks you to fill in the rest.
 */
export const slackProfile: UserProfile = {
  name: "Jess Lin",
  role: "Product Manager",
  department: "Product",
  team: "Spend Management",
  location: "San Francisco, CA",
  email: "jess.lin@fernway.com",
  bio: "",
  skills: [],
  projects: [],
  experience: [],
  bestFor: "",
};

/** The fully filled-in profile, used when someone skips onboarding. */
export const defaultProfile: UserProfile = {
  name: "Jess Lin",
  role: "Product Manager",
  department: "Product",
  team: "Spend Management",
  location: "San Francisco, CA",
  email: "jess.lin@fernway.com",
  bio: "PM for corporate cards and spend controls. Before Fernway I was a consultant, so I really like a good spreadsheet.",
  skills: ["Product discovery", "Roadmapping", "SQL", "User interviews"],
  projects: [
    {
      name: "Card spend controls",
      status: "current",
      period: "2026",
      role: "PM",
      summary: "Merchant-category limits and real-time approvals for corporate cards.",
      tags: ["cards", "spend", "approvals"],
    },
    {
      name: "Expense policy engine",
      status: "past",
      period: "2025",
      role: "Associate PM",
      summary: "Rules engine for automatic expense policy checks.",
      tags: ["expenses", "policy", "automation"],
    },
  ],
  experience: [
    { title: "Associate PM", company: "Fernway", period: "2024–2025" },
    { title: "Consultant", company: "Bain & Company", period: "2021–2024" },
  ],
  bestFor: "corporate cards, spend controls and approval flows",
};

/** One-click suggestions in profile setup, "found" in the channels you're in. */
export const profileSuggestions = {
  skills: ["Product discovery", "Roadmapping", "SQL", "User interviews", "PRDs", "Pricing experiments", "Figma", "A/B testing"],
  projects: defaultProfile.projects.map((p) => ({ ...p, source: p.status === "current" ? "#spend-controls" : "Confluence" })),
  bio: defaultProfile.bio,
  bestFor: defaultProfile.bestFor ?? "",
};

export const defaultSettings: Settings = {
  discoverable: true,
  showAvailability: true,
  defaultDuration: 30,
  defaultFormat: "video",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  resultCount: 3,
  dmNotifications: true,
  weeklyDigest: false,
  nudgeTone: "friendly",
  nudgeCadence: "before-due",
};

// ---------- delivery timeline & nudges ----------

/** Delivery milestones Chilla cross-checks nudge due dates against. */
export const milestones: Milestone[] = [
  { id: "load-test", name: "Load test sign-off", inWeekdays: 2 },
  { id: "launch", name: "Q4 Checkout & Payouts launch", inWeekdays: 3 },
  { id: "spend-beta", name: "Spend controls beta", inWeekdays: 8 },
];

/** How each person answers a nudge. {due} is replaced with the due date. */
export const nudgeReplies: Record<string, { status: NudgeReplyStatus; text: string }> = {
  "dev-patel": { status: "on-track", text: "Yep! 5× peak run finished last night, p99 is 310ms ✅ Writing it up now, you'll have the doc by {due}." },
  "grace-liu": { status: "need-time", text: "Thanks for the ping. Legal review on the consent banner needs one more pass, so can we say the day after {due}? I'll flag it if that slips." },
  "isabel-torres": { status: "on-track", text: "On it 🎨 Mocks are 80% there, sharing in Figma by {due}." },
  "chloe-dubois": { status: "on-track", text: "Release notes draft is in the launch doc already. I'll have the final copy by {due} 🚀" },
  "priya-raman": { status: "done", text: "Already done! Merged this morning. Link's in #payments-squad 🙌" },
  "sofia-marquez": { status: "blocked", text: "Blocked on the Okta sandbox, waiting on IT. Could you help escalate? Otherwise it slips past {due}." },
  "ethan-brooks": { status: "on-track", text: "Dashboard is building now, should be live by {due} 📊" },
};
export const defaultNudgeReply = { status: "on-track" as NudgeReplyStatus, text: "On it 👍 You'll have it by {due}." };

/** Replies when you DM someone directly. */
export const dmReplies = [
  "Hey! 👋 Sure, what's up?",
  "Happy to help. Can you share a bit more context?",
  "👀 On it, give me a few minutes.",
  "Good question! Let me check and get back to you today.",
];

/** The nudge a teammate's Chilla sends you, so you can try responding. */
export const incomingNudgeSeed: Omit<IncomingNudge, "id" | "createdAt" | "due"> & { inWeekdays: number } = {
  fromId: "isabel-torres",
  ask: "Review the spend-controls approval flow mocks and leave comments in Figma",
  milestoneId: "spend-beta",
  inWeekdays: 2,
};

// ---------- guided tour scenario ----------

/** The question and nudge the guided tour suggests. */
export const tourScenario = {
  query: "Who's running load tests before the Q4 launch?",
  nudge: { employeeId: "dev-patel", ask: "Share the checkout load test results", milestoneId: "launch", inWeekdays: 2 },
};

export const slashCommands = [
  { cmd: "/chilla find", args: "[question]", desc: "Get the top people to ask about something" },
  { cmd: "/chilla nudge", args: "@person [what you need]", desc: "Have Chilla follow up with someone for you" },
  { cmd: "/chilla meet", args: "@person", desc: "Find a time you're both free" },
  { cmd: "/chilla profile", args: "", desc: "Update what you work on" },
  { cmd: "/chilla help", args: "", desc: "See everything Chilla can do" },
];
