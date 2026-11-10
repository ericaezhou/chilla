import { employees } from "@/data/employees";
import type { ChatMessage, SearchFilters, Settings } from "@/lib/types";
import { recommend } from "@/lib/search/engine";

// Chilla's "brain": turns a user message into bot replies.
// Pure functions only. Timing, typing indicators and storage live in WorkspaceProvider.

export const CHILLA_DM = "chilla";

/** Conversation id for a DM with a colleague. */
export const dmId = (employeeId: string) => `dm:${employeeId}`;
export const dmEmployeeId = (convId: string) => (convId.startsWith("dm:") ? convId.slice(3) : null);

export const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export function chillaText(text: string, extra?: { ephemeral?: boolean }): ChatMessage {
  return { id: uid(), kind: "text", author: "chilla", ts: now(), text, ...extra };
}

export function userText(text: string, via?: "chilla"): ChatMessage {
  return { id: uid(), kind: "text", author: "me", ts: now(), text, ...(via && { via }) };
}

export function personText(employeeId: string, text: string): ChatMessage {
  return { id: uid(), kind: "text", author: employeeId, ts: now(), text };
}

export function systemText(text: string): ChatMessage {
  return { id: uid(), kind: "system", author: "system", ts: now(), text };
}

/** What Chilla posts in its DM right after it's installed. */
export function welcomeMessages(firstName: string): ChatMessage[] {
  return [
    chillaText(
      `Hi ${firstName} 👋 I'm **Chilla**. Ask me who to talk to about a project, a decision or a problem, and I'll find the people who actually know, plus why I picked each one. I can also book time and follow up with people for you.`,
    ),
    { id: uid(), kind: "setup", author: "chilla", ts: now() },
  ];
}

/** Does this message in a channel address Chilla? (DMs always do.) */
export const mentionsChilla = (text: string) => /@chilla\b/i.test(text);

export const HELP_TEXT =
  "Here's what I can do:\n• **Find people:** ask in plain English, e.g. **\"Who knows the SSO migration?\"**, or use `/chilla find`.\n• **Book time:** `/chilla meet @priya` finds a slot you're both free.\n• **Nudge:** `/chilla nudge @dev share the load test results` and I'll follow up for you until it's done.\n• **Profile:** `/chilla profile` updates what you work on so people can find you.";

export function respond(
  text: string,
  opts: { settings: Settings; filters?: SearchFilters; ephemeral?: boolean },
): ChatMessage[] {
  const clean = text.replace(/@chilla\b/gi, "").trim();
  const lower = clean.toLowerCase();
  const extra = { ephemeral: opts.ephemeral };

  if (!clean || /^(hi|hey|hello|yo|howdy|good (morning|afternoon))\b[!. ]*$/.test(lower)) {
    return [chillaText("Hey! 👋 What are you working on? Tell me the project or problem and I'll find who to ask.", extra)];
  }
  if (/^(thanks|thank you|thx|ty|cheers|perfect|great|awesome)\b/.test(lower)) {
    return [chillaText("Anytime! Ping me whenever you're stuck on **who owns what**. 🫶", extra)];
  }
  if (/^(help|what can you do|\?)/.test(lower)) {
    return [chillaText(HELP_TEXT, extra)];
  }

  const f = opts.filters ?? {};
  const pool = employees.filter(
    (e) =>
      !f.excludeIds?.includes(e.id) &&
      (!f.department || e.department === f.department) &&
      (!f.availableOnly || e.availability === "available"),
  );
  const { topic, results } = recommend(clean, pool, opts.settings.resultCount);

  if (!results.length) {
    const narrowed = f.department || f.availableOnly || f.excludeIds?.length;
    return [
      chillaText(
        narrowed
          ? `Nobody else matches **${topic}** with those filters. Try removing a filter, or browse the **Directory** tab.`
          : `Hmm, I couldn't find anyone who clearly works on **${topic}** 🤔 Try naming a project, skill or team (like "checkout", "SSO" or "pricing"), or browse the **Directory** tab.`,
        extra,
      ),
    ];
  }

  return [
    {
      id: uid(),
      kind: "recommendations",
      author: "chilla",
      ts: now(),
      query: clean,
      topic,
      results,
      ...(opts.filters && { filters: opts.filters }),
      ...extra,
    },
  ];
}

// ---------- slash commands ----------

export type SlashCommand =
  | { name: "find"; query: string }
  | { name: "nudge"; employeeId?: string; ask: string }
  | { name: "meet"; employeeId?: string }
  | { name: "profile" }
  | { name: "help" };

/** Match "@dev", "@priya" or a first name to a colleague. */
export function findMention(text: string) {
  const handle = text.match(/@([a-z][\w.-]*)/i)?.[1]?.toLowerCase();
  if (!handle || handle === "chilla") return undefined;
  return employees.find(
    (e) => e.slack.slice(1).toLowerCase() === handle || e.name.split(" ")[0].toLowerCase() === handle || e.id === handle,
  );
}

export function parseSlash(text: string): SlashCommand | null {
  const m = text.trim().match(/^\/chilla\b\s*(\w+)?\s*([\s\S]*)$/i);
  if (!m) return null;
  const verb = (m[1] ?? "").toLowerCase();
  const rest = m[2].trim();
  switch (verb) {
    case "nudge": {
      const person = findMention(rest);
      return { name: "nudge", employeeId: person?.id, ask: rest.replace(/@[\w.-]+/, "").trim() };
    }
    case "meet":
      return { name: "meet", employeeId: findMention(rest)?.id };
    case "profile":
      return { name: "profile" };
    case "":
    case "help":
      return { name: "help" };
    case "find":
      return { name: "find", query: rest };
    default:
      // "/chilla who knows SSO?" works like find.
      return { name: "find", query: `${m[1]} ${rest}`.trim() };
  }
}
