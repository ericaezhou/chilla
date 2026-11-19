import { employees, getEmployee } from "@/data/employees";
import type { ChatAction, ChatMessage, Department, Employee, Recommendation, SearchFilters, Settings } from "@/lib/types";
import { listify, parseQuery, recommend, scorePeople, tokenize } from "@/lib/search/engine";

// Chilla's "brain": turns a user message into bot replies.
// Pure functions only. Timing, typing indicators and storage live in WorkspaceProvider.
//
// Order of checks in respond():
//   small talk → calendar privacy → follow-ups on earlier results →
//   "X or Y?" team comparisons → questions about a named person → search.

export const CHILLA_DM = "chilla";

/** Conversation id for a DM with a colleague. */
export const dmId = (employeeId: string) => `dm:${employeeId}`;
export const dmEmployeeId = (convId: string) => (convId.startsWith("dm:") ? convId.slice(3) : null);

export const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export function chillaText(text: string, extra?: { ephemeral?: boolean; actions?: ChatAction[] }): ChatMessage {
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
      `Hi ${firstName} 👋 I'm **Chilla**. Ask me who to talk to about a project, a decision or a problem, and I'll find the people who actually know, plus why I picked each one and who can introduce you. I can also book time and follow up with people for you.`,
    ),
    { id: uid(), kind: "setup", author: "chilla", ts: now() },
  ];
}

/** Does this message in a channel address Chilla? (DMs always do.) */
export const mentionsChilla = (text: string) => /@chilla\b/i.test(text);

export const HELP_TEXT =
  "Here's what I can do:\n• **Find people:** ask in plain English, e.g. **\"Who knows the SSO migration?\"**, or use `/chilla find`. Then ask follow-ups like **\"Which of them is most technical?\"**\n• **Compare teams:** **\"Should I ask design or payments engineering about checkout drop-offs?\"**\n• **Warm intros:** every match shows how you're connected and who can introduce you.\n• **Book time:** `/chilla meet @priya` finds a slot you're both free. I only ever see free/busy, never what's in anyone's meetings.\n• **Nudge:** `/chilla nudge @dev share the load test results` and I'll follow up for you until it's done.\n• **Profile:** `/chilla profile` updates what you work on so people can find you.";

const first = (e: Employee) => e.name.split(" ")[0];
const roleCase = (role: string) =>
  role.split(" ").map((w) => (/^[A-Z]{2,}/.test(w) ? w : w.toLowerCase())).join(" ");
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- names ----------

/** Every first name, last name and possessive ("priyas") in the directory. */
const NAME_WORDS = new Set(
  employees.flatMap((e) =>
    tokenize(e.name).flatMap((n) => [n, `${n}s`, n.normalize("NFD").replace(/[̀-ͯ]/g, "")]),
  ),
);

/** Colleagues mentioned by first name, full name or @handle. */
export function peopleMentioned(text: string) {
  const words = new Set(tokenize(text.normalize("NFD").replace(/[̀-ͯ]/g, "")).map((w) => w.replace(/s$/, "")));
  const handles = [...text.matchAll(/@([a-z][\w.-]*)/gi)].map((m) => m[1].toLowerCase());
  return employees.filter((e) => {
    const f = first(e).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    return words.has(f) || words.has(f.replace(/s$/, "")) || handles.includes(e.slack.slice(1).toLowerCase());
  });
}

// ---------- calendar privacy ----------

const CALENDAR = /\b(calendar|calender|agenda|schedule|meetings?|busy|free|availability|available|booked|ooo|out of office|doing)\b/;
const DETAILS = /\b(what|whats|show|see|tell|which|details|agenda|who (is|are) .* meeting|meeting with)\b/;
const WHEN = /\b(when|time|times|slot|slots|free|available|availability)\b/;

function calendarReply(lower: string, mentioned: Employee[], extra: Extra): ChatMessage[] | null {
  const person = mentioned[0];
  const aboutOthers = person || /\b(everyone|someone|their|team'?s|others|people'?s)\b/.test(lower);
  if (!aboutOthers || !CALENDAR.test(lower)) return null;
  // "What's on X's calendar" vs "when is X free".
  const wantsDetails = /\b(calendar|agenda|meetings?|doing|booked)\b/.test(lower) && DETAILS.test(lower) && !/\bwhen\b/.test(lower);
  if (!wantsDetails && !WHEN.test(lower)) return null;

  const privacy = "I only ever see **free/busy** blocks. Meeting titles, attendees, locations and notes stay private, for everyone's calendar, including yours.";
  if (!person) {
    return [chillaText(`I can't share what's on other people's calendars. 🔒 ${privacy}`, extra)];
  }
  const actions: ChatAction[] = [{ type: "meet", label: `Find a time with ${first(person)}`, employeeId: person.id }];
  return [
    chillaText(
      wantsDetails
        ? `I can't tell you what **${first(person)}** has on their calendar. 🔒 ${privacy}\n\nIf you're trying to get time with ${first(person)}, I can find a slot you're both free.`
        : `I can't see what's in **${first(person)}'s** meetings, only when they're free or busy. 🔒 Want me to find a slot that works for both of you?`,
      { ...extra, actions },
    ),
  ];
}

// ---------- follow-ups ----------

type Recs = Extract<ChatMessage, { kind: "recommendations" }>;

const FOLLOW_UP =
  /\b(of|among|between|out of) (them|these|those|the (two|three|2|3|people|ones|above))\b|\bwhich one\b|\bwho among\b|^(and )?(which|who)('?s| is| would be) (best|better|most)\b(?! (at|about|on|in|with) )/;
const MORE = /^(anyone|anybody|who|someone) else\b|^(show )?(me )?(more|others|other people)\b/;
const WHAT_ABOUT = /^(what|how) about\b/;

interface Lens {
  id: string;
  words: RegExp;
  depts: Department[];
  /** Fallback description: "best for ___". */
  phrase: string;
  /** For comparisons: when to pick this team. */
  pickIf: string;
}

// Order matters: "product design" is design, "payments engineering" is engineering.
const LENSES: Lens[] = [
  {
    id: "design",
    words: /\b(product design|design|designers?|ux|ui|user experience|mockups?|figma|visual)\b/,
    depts: ["Design"],
    phrase: "the design side",
    pickIf: "the problem is in the experience itself: confusing steps, form friction, unclear copy or error states",
  },
  {
    id: "engineering",
    words: /\b(technical|technically|implementation|implement|engineering|engineers?|eng|code|coding|architecture|apis?|backend|frontend|infra|devs?|developers?|platform)\b/,
    depts: ["Engineering"],
    phrase: "the technical side",
    pickIf: "the problem is technical: things failing or erroring, slow load times, or how the system is built",
  },
  {
    id: "research",
    words: /\b(research|researchers?|interviews?|usability)\b/,
    depts: ["Design"],
    phrase: "talking to customers",
    pickIf: "you don't know yet why it's happening and need to hear it from customers",
  },
  {
    id: "product",
    words: /\b(product|pms?|product managers?|roadmap|priorit\w*|requirements?|scope|decisions?|decided)\b/,
    depts: ["Product"],
    phrase: "priorities and decisions",
    pickIf: "you need someone to make a call on priorities, scope or requirements",
  },
  {
    id: "marketing",
    words: /\b(marketing|gtm|go-to-market|pmm|messaging|positioning|comms)\b/,
    depts: ["Marketing"],
    phrase: "messaging and launch",
    pickIf: "it's about messaging, positioning or how customers hear about it",
  },
  {
    id: "operations",
    words: /\b(ops|operations|business|finance|financial|legal|compliance|support|cost|revenue|margins?|budget)\b/,
    depts: ["Operations"],
    phrase: "the business side",
    pickIf: "it's about process, policy, pricing, finance or support",
  },
];

const lensOf = (s: string) => LENSES.find((l) => l.words.test(s));
const stripLens = (s: string) => LENSES.reduce((acc, l) => acc.replace(new RegExp(l.words, "g"), " "), s);

function lastRecs(history: ChatMessage[] | undefined): Recs | undefined {
  return [...(history ?? [])].reverse().find((m): m is Recs => m.kind === "recommendations" && m.results.length > 0);
}

/** One line on why someone fits, built from their strongest current project. */
function credential(e: Employee) {
  const p = e.projects.find((x) => x.status === "current") ?? e.projects[0];
  return p
    ? `${first(e)} is a ${e.role} and ${p.status === "current" ? "" : "was "}${roleCase(p.role)} on **${p.name}**`
    : `${first(e)} is a ${e.role} on ${e.team}`;
}

function followUp(text: string, lower: string, prev: Recs, extra: Extra): ChatMessage[] {
  const pool = prev.results.map((r) => getEmployee(r.employeeId)).filter((e): e is Employee => !!e);
  const lens = lensOf(lower);
  const content = scorePeople(stripLens(lower), pool, NAME_WORDS);
  const hasContent = content.some((c) => c.score > 0);

  if (!lens && !hasContent) {
    return [
      chillaText(
        `Best for what? Tell me what matters most, e.g. **"which of them is most technical?"** or **"which of them owns the roadmap?"**, and I'll pick from the ${pool.length} people I suggested for **${prev.topic}**.`,
        extra,
      ),
    ];
  }

  const ranked = pool
    .map((e, i) => {
      const inLens = lens ? (lens.depts.includes(e.department) ? 1 : 0) + (lens.id === "research" && /research/i.test(e.role) ? 0.5 : 0) : 0;
      const prevRel = (prev.results[i].relevance ?? 50) / 100;
      return { e, rec: prev.results[i], s: inLens + content[i].score * 0.8 + prevRel * 0.15 };
    })
    .sort((a, b) => b.s - a.s);
  const top = ranked[0];
  const forWhat = lower.match(/\bfor (.+?)[?.!]*$/)?.[1] ?? lens?.phrase ?? "that";
  const lensMatched = !lens || lens.depts.includes(top.e.department);

  const intro = lensMatched
    ? `Of the ${pool.length} people I suggested for **${prev.topic}**, **${top.e.name}** is the best fit for ${forWhat}. ${credential(top.e)}.`
    : `None of the ${pool.length} people I suggested for **${prev.topic}** is a clear fit for ${forWhat}. The closest is **${top.e.name}**: ${credential(top.e)}.`;
  const notes = ranked.slice(1).map(({ e }) => `**${e.name}** (${e.role}) is better for ${e.bestFor}.`);
  const actions: ChatAction[] | undefined =
    !lensMatched && lens
      ? [{ type: "search", label: `Find ${lens.phrase} people for ${prev.topic}`, query: `${prev.topic} ${lens.id}` }]
      : undefined;

  const reply: ChatMessage = {
    id: uid(),
    kind: "recommendations",
    author: "chilla",
    ts: now(),
    query: prev.query,
    topic: prev.topic,
    results: [top.rec],
    intro,
    notes,
    noRefine: true,
    ...extra,
  };
  return actions ? [reply, chillaText("Want me to look outside that list?", { ...extra, actions })] : [reply];
}

// ---------- "should I ask A or B?" ----------

interface Side {
  label: string;
  lens: Lens;
  qualifier: string;
}

function parseComparison(text: string): { sides: [Side, Side]; topic: string } | null {
  const sentences = text.split(/(?<=[.?!])\s+/);
  const idx = sentences.findIndex((s) => /\bor\b/i.test(s) && /\b(talk|speak|ask|go|reach|contact|loop|work|someone|team)\b/i.test(s));
  if (idx < 0) return null;
  const sentence = sentences[idx].replace(/[?.!]+$/, "");
  const [rawA, rawB] = sentence.split(/\s+or\s+/i);
  if (!rawB) return null;

  const aboutIdx = rawB.search(/\b(about|on|for|with)\b/i);
  const bText = aboutIdx > 0 ? rawB.slice(0, aboutIdx) : rawB;
  const aboutTopic = aboutIdx > 0 ? rawB.slice(aboutIdx).replace(/^\w+\s+/, "") : "";
  // Left side: words after the last "in/from/to/ask" ("someone in product design").
  const aText = rawA.split(/\b(?:in|from|to|ask|on|with)\b/i).pop() ?? rawA;

  const side = (raw: string): Side | null => {
    const label = raw.replace(/\b(someone|somebody|the|a|an|people|team|folks)\b/gi, " ").replace(/\s+/g, " ").trim();
    const lens = lensOf(label.toLowerCase());
    if (!lens || !label) return null;
    return { label: capitalize(label), lens, qualifier: stripLens(label.toLowerCase()).trim() };
  };
  const a = side(aText);
  const b = side(bText);
  if (!a || !b || a.lens.id === b.lens.id) return null;

  const topic = [...sentences.slice(0, idx), ...sentences.slice(idx + 1), aboutTopic].join(" ").trim();
  return { sides: [a, b], topic };
}

function compare(parsed: NonNullable<ReturnType<typeof parseComparison>>, extra: Extra): ChatMessage[] {
  const { sides, topic } = parsed;
  const topicWords = parseQuery(stripLens(topic.toLowerCase()), NAME_WORDS).keywords.join(" ");
  const picks = sides.map((s) => {
    const pool = employees.filter((e) => s.lens.depts.includes(e.department));
    const ranked = scorePeople(`${topicWords} ${s.qualifier}`, pool, NAME_WORDS).sort(
      (x, y) => y.coverage - x.coverage || y.score - x.score,
    );
    return { side: s, best: ranked[0]?.score ? ranked[0] : undefined };
  });

  const shown = picks.filter((p) => p.best?.rec);
  const topicLabel = topicWords || "this";
  const notes = picks.map(({ side, best }) =>
    best
      ? `**${side.label} → ${best.e.name}** if ${side.lens.pickIf}. ${credential(best.e)}.`
      : `**${side.label}:** I don't have anyone in ${side.lens.depts.join("/")} with experience in ${topicLabel}.`,
  );

  // Someone outside both teams who owns the area can tell you which it is.
  const chosen = new Set(shown.map((p) => p.best!.e.id));
  const owner = scorePeople(topicWords, employees.filter((e) => e.department === "Product" && !chosen.has(e.id)), NAME_WORDS)
    .filter((x) => x.coverage === 1)
    .sort((x, y) => y.score - x.score)[0];
  if (owner && !sides.some((s) => s.lens.id === "product")) {
    notes.push(`Not sure which it is? **${owner.e.name}** (${owner.e.role}, ${owner.e.team}) owns this area and can tell you where the problem actually is.`);
  }

  return [
    {
      id: uid(),
      kind: "recommendations",
      author: "chilla",
      ts: now(),
      query: topic || sides.map((s) => s.label).join(" or "),
      topic: topicLabel,
      // Not a ranking, so no match %: each person answers a different "why".
      results: shown.map((p) => ({ ...(p.best!.rec as Recommendation), relevance: undefined })),
      intro: `Both teams can help with **${topicLabel}**, but for different reasons. It depends on why it's happening:`,
      notes,
      noRefine: true,
      ...extra,
    },
  ];
}

// ---------- main ----------

type Extra = { ephemeral?: boolean };

export function respond(
  text: string,
  opts: { settings: Settings; filters?: SearchFilters; ephemeral?: boolean; history?: ChatMessage[] },
): ChatMessage[] {
  const clean = text.replace(/@chilla\b/gi, "").trim();
  const lower = clean.toLowerCase().replace(/[’]/g, "'");
  const extra: Extra = { ephemeral: opts.ephemeral };

  if (!clean || /^(hi|hey|hello|yo|howdy|good (morning|afternoon))\b[!. ]*$/.test(lower)) {
    return [chillaText("Hey! 👋 What are you working on? Tell me the project or problem and I'll find who to ask.", extra)];
  }
  if (/^(thanks|thank you|thx|ty|cheers|perfect|great|awesome)\b/.test(lower)) {
    return [chillaText("Anytime! Ping me whenever you're stuck on **who owns what**. 🫶", extra)];
  }
  if (/^(help|what can you do|\?)/.test(lower)) {
    return [chillaText(HELP_TEXT, extra)];
  }

  const mentioned = peopleMentioned(clean);
  const cal = calendarReply(lower, mentioned, extra);
  if (cal) return cal;

  const prev = opts.filters ? undefined : lastRecs(opts.history);
  if (FOLLOW_UP.test(lower)) {
    if (prev) return followUp(clean, lower, prev, extra);
    return [chillaText("I don't have earlier suggestions in this chat to choose from. Ask me about a topic first, e.g. **\"Who knows payments integration?\"**", extra)];
  }
  if (prev && MORE.test(lower)) {
    return respond(prev.query, { ...opts, filters: { excludeIds: prev.results.map((r) => r.employeeId) } });
  }
  if (prev && WHAT_ABOUT.test(lower)) {
    const lens = lensOf(lower);
    if (lens && lens.depts.length === 1) return respond(prev.query, { ...opts, filters: { department: lens.depts[0] } });
  }

  const comparison = parseComparison(clean);
  if (comparison) return compare(comparison, extra);

  // "Who's free to help with dashboards?" means available people only.
  const wantsAvailable = !mentioned.length && /\b(free|available)\b/.test(lower) && !opts.filters;
  const f: SearchFilters = opts.filters ?? (wantsAvailable ? { availableOnly: true } : {});
  const pool = employees.filter(
    (e) =>
      !f.excludeIds?.includes(e.id) &&
      (!f.department || e.department === f.department) &&
      (!f.availableOnly || e.availability === "available"),
  );
  const search = recommend(clean, pool, opts.settings.resultCount, { ignore: NAME_WORDS, universe: employees });
  const { topic, results } = search;

  // "Who is Priya?": nothing to search for except the person.
  if (!search.parsed.reqs.length && mentioned.length) {
    const e = mentioned[0];
    return [
      {
        id: uid(),
        kind: "recommendations",
        author: "chilla",
        ts: now(),
        query: clean,
        topic: e.team,
        results: [{ employeeId: e.id, reasons: e.projects.slice(0, 2).map((p) => `${p.status === "current" ? "Currently" : "Was"} **${roleCase(p.role)}** on **${p.name}**`), evidence: [], gaps: [] }],
        intro: `**${e.name}** is a ${e.role} on **${e.team}**. Ask ${first(e)} about ${e.bestFor}.`,
        noRefine: true,
        ...extra,
      },
    ];
  }

  if (search.unknown.length) return unknownReply(clean, search, opts.history, extra);

  if (!results.length && wantsAvailable) {
    // Nobody free right now: show who knows it anyway, so you can book ahead.
    const all = respond(clean.replace(/\b(free|available)\b/gi, ""), { ...opts, filters: {} });
    const recs = all.find((m): m is Recs => m.kind === "recommendations");
    if (recs) return [{ ...recs, intro: `Nobody who works on **${topic}** is available right now. Here's who knows it best, so you can book time for when they're free:` }];
    return all;
  }

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

  const labels = search.parsed.reqs.map((r) => `**${r.label}**`);
  let intro: string | undefined;
  const notes: string[] = [];
  if (search.partial) {
    intro = `Nobody at Fernway has direct experience with all of ${listify(labels)}. Here's who comes closest, and what each one is missing:`;
  } else if (labels.length > 1 && /\b(both|and|plus|as well as)\b/.test(lower)) {
    intro = `${results.length === 1 ? "One person has" : `${results.length} people have`} experience with ${listify(labels)}:`;
    for (const n of search.near) {
      const e = getEmployee(n.employeeId);
      if (e && n.missing.length) notes.push(`**${e.name}** also came up, but has nothing on ${listify(n.missing.map((m) => `**${m}**`))}.`);
    }
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
      ...(intro && { intro }),
      ...(notes.length && { notes }),
      ...((opts.filters || wantsAvailable) && { filters: f }),
      ...extra,
    },
  ];
}

/** Say "I don't know" for topics nobody has, instead of guessing. */
function unknownReply(clean: string, search: ReturnType<typeof recommend>, history: ChatMessage[] | undefined, extra: Extra): ChatMessage[] {
  const kw = search.parsed.keywords;
  // Show the unknown word with the topic it modifies: "people analytics", "Hogwarts pricing".
  // Unknown words typed side by side are one name ("quantum computing").
  const adjacent = search.unknown.every((u, i) => i === 0 || kw.indexOf(u) === kw.indexOf(search.unknown[i - 1]) + 1);
  const phrase = search.unknown
    .map((u) => {
      const i = kw.findIndex((k) => k === u || k.replace(/s$/, "") === u);
      const next = kw[i + 1];
      const word = clean.match(new RegExp(`\\b${u}\\w*`, "i"))?.[0] ?? u;
      return next && search.known.some((k) => k.startsWith(next.replace(/s$/, ""))) ? `${word} ${next}` : word;
    })
    .join(adjacent ? " " : " / ");

  const lead = `I don't know anyone at Fernway connected to **${phrase}**. It isn't a project, team or skill on anyone's profile, so I'd rather not guess. 🤔`;
  const repeat = (history ?? []).some((m) => m.kind === "text" && m.author === "chilla" && m.text.startsWith(lead));
  const actions: ChatAction[] = search.known.length
    ? [{ type: "search", label: `Show people who know ${search.known.join(" ")}`, query: search.known.join(" ") }]
    : [];
  const more = search.known.length
    ? ` I do know who works on **${search.known.join(" ")}** in general, if that helps.`
    : " Try a project, skill or team name, or browse the **Directory** tab.";
  const again = repeat
    ? "\n\nSame answer as before: nothing new has been added to anyone's profile. If this person exists, asking in **#general** may reach someone who isn't on Chilla yet."
    : "";
  return [chillaText(lead + more + again, { ...extra, ...(actions.length && { actions }) })];
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
