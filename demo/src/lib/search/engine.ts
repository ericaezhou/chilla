import type { Employee, Evidence, Project, Recommendation } from "@/lib/types";
import { concepts, softWords, stopwords } from "./concepts";

// A small, deterministic stand-in for Chilla's AI ranking.
// 1. Split the question into requirements ("checkout", "conversion"). Filler
//    words are dropped, and words that only sharpen a topic ("systems") are soft.
// 2. For each person, find the strongest evidence for every requirement:
//    a direct match (the word itself) or a related one (a synonym, worth less).
// 3. The match % is absolute: how well this person covers *everything* asked,
//    not how they compare to the top result. Gaps are spelled out.
// 4. Requirements nobody in the directory has evidence for are reported back
//    as unknown, so Chilla can say "I don't know" instead of guessing.

/** How much a hit in each part of a profile is worth. */
const FIELD = {
  tag: 0.9,
  expertise: 0.9,
  skill: 0.88,
  projectText: 0.8,
  roleTeam: 0.7,
  bestFor: 0.6,
  bio: 0.5,
};
const RELATED = 0.6;
const PAST_PROJECT = 0.95;
const EXTRA_HIT = 0.04;
const PHRASE_BONUS = 0.03;
const MIN_SCORE = 0.5;

/** Common words that describe a topic loosely. Never required unless they're all there is. */
const GENERIC = new Set([
  "data", "change", "changes", "model", "decided", "decide", "decision", "decisions", "q4", "q1", "q2", "q3",
  "project", "projects", "admin", "admins", "user", "users", "customer", "team", "product",
]);

interface Requirement {
  label: string;
  exact: string[];
  related: string[];
  concept?: string;
}

export interface ParsedQuery {
  /** Meaningful words in the order they were typed (no filler). */
  keywords: string[];
  reqs: Requirement[];
  /** Adjacent keyword pairs, which earn a bonus when they appear together. */
  phrases: string[];
  /** Loose words ("decided", "data") that add a small bonus but are never required. */
  generic: string[];
}

/** Loose words that should also match a related form on a profile. */
const GENERIC_FORMS: Record<string, string[]> = {
  decided: ["decided", "decision"],
  decide: ["decide", "decision"],
  decision: ["decision"],
};

export const normalize = (s: string) =>
  s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9/&\- ]+/g, " ");

// Whole-word match that tolerates simple suffixes ("test" ~ "tests" / "testing").
const wordCache = new Map<string, RegExp>();
function hasWord(haystack: string, needle: string) {
  let re = wordCache.get(needle);
  if (!re) {
    re = new RegExp(`(^|[^a-z0-9])${escape(needle)}(s|es|ed|ing)?([^a-z0-9]|$)`);
    wordCache.set(needle, re);
  }
  return re.test(haystack);
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
export const singular = (t: string) =>
  t.length > 3 && t.endsWith("s") && !t.endsWith("ss") ? t.slice(0, -1) : t;

function conceptFor(token: string) {
  return concepts.find(([, ...words]) => words.some((w) => w === token || w === singular(token)));
}

export function tokenize(query: string) {
  return normalize(query).split(/\s+/).filter((t) => t.length > 1);
}

/**
 * Turn a question into requirements. `ignore` holds words to skip entirely,
 * like colleagues' names.
 */
export function parseQuery(query: string, ignore: Set<string> = new Set()): ParsedQuery {
  const raw = tokenize(query);
  // "people analytics" is a topic; "people who know SSO" is not.
  const kept = raw.filter((t, i) => {
    if (ignore.has(t)) return false;
    if ((t === "people" || t === "person") && raw[i + 1] && !stopwords.has(raw[i + 1]) && !ignore.has(raw[i + 1])) return true;
    return !stopwords.has(t);
  });

  const isSoft = (t: string) => softWords.has(t) || GENERIC.has(singular(t));
  // If someone only typed generic words ("data"), those are the topic.
  const onlyLoose = kept.every(isSoft);

  const reqs: Requirement[] = [];
  for (let i = 0; i < kept.length; i++) {
    // Known phrases ("design system", "fraud detection") win over their parts,
    // even when one part is a soft word on its own.
    const next = kept[i + 1];
    const phraseConcept = next ? conceptFor(`${kept[i]} ${singular(next)}`) ?? conceptFor(`${kept[i]} ${next}`) : undefined;
    if (phraseConcept) {
      reqs.push(makeReq(`${kept[i]} ${next}`, [`${kept[i]} ${singular(next)}`, `${kept[i]} ${next}`], phraseConcept));
      i++;
      continue;
    }
    if (isSoft(kept[i]) && !(onlyLoose && !softWords.has(kept[i]))) continue;
    reqs.push(makeReq(kept[i], [singular(kept[i]), kept[i]], conceptFor(kept[i])));
  }

  const phrases: string[] = [];
  for (let i = 0; i < kept.length - 1; i++) phrases.push(`${kept[i]} ${singular(kept[i + 1])}`);

  const generic = !onlyLoose ? kept.filter((t) => GENERIC.has(singular(t))).flatMap((t) => GENERIC_FORMS[t] ?? [singular(t)]) : [];
  return { keywords: kept, reqs: dedupe(reqs), phrases, generic };
}

function makeReq(label: string, exact: string[], concept?: string[]): Requirement {
  const ex = [...new Set(exact)];
  return {
    label,
    exact: ex,
    related: concept ? concept.slice(1).filter((w) => !ex.includes(w)) : [],
    concept: concept?.[0],
  };
}

const dedupe = (reqs: Requirement[]) => reqs.filter((r, i) => reqs.findIndex((x) => x.label === r.label) === i);

// ---------- scoring ----------

interface Field {
  text: string;
  weight: number;
  /** What to call this evidence in an explanation. */
  source: string;
  project?: Project;
}

const fieldCache = new WeakMap<Employee, Field[]>();
function fieldsOf(e: Employee): Field[] {
  const hit = fieldCache.get(e);
  if (hit) return hit;
  const f: Field[] = [];
  for (const p of e.projects) {
    const age = p.status === "current" ? 1 : PAST_PROJECT;
    f.push({ text: normalize(p.tags.join(" , ")), weight: FIELD.tag * age, source: p.name, project: p });
    f.push({ text: normalize(`${p.name} ${p.summary}`), weight: FIELD.projectText * age, source: p.name, project: p });
  }
  for (const x of e.expertise) f.push({ text: normalize(x), weight: FIELD.expertise, source: x });
  for (const s of e.skills) f.push({ text: normalize(s), weight: FIELD.skill, source: s });
  f.push({ text: normalize(`${e.role} ${e.team} ${e.department}`), weight: FIELD.roleTeam, source: `their role on ${e.team}` });
  f.push({ text: normalize(e.bestFor), weight: FIELD.bestFor, source: "what they're known for" });
  f.push({ text: normalize(e.bio), weight: FIELD.bio, source: "their bio" });
  fieldCache.set(e, f);
  return f;
}

interface Scored {
  e: Employee;
  score: number;
  coverage: number;
  /** Share of requirements backed by a direct match, not just a synonym. */
  direct: number;
  evidence: Evidence[];
  projects: Project[];
  skills: string[];
  expertise: string[];
}

function scoreEmployee(e: Employee, q: ParsedQuery): Scored {
  const fields = fieldsOf(e);
  const evidence: Evidence[] = [];
  const projectHits = new Map<Project, number>();
  const skills = new Set<string>();
  const expertise = new Set<string>();
  let total = 0;

  for (const req of q.reqs) {
    let best = 0;
    let bestField: Field | undefined;
    let exactFields = 0;
    for (const f of fields) {
      if (!req.exact.some((w) => hasWord(f.text, w))) continue;
      exactFields++;
      if (f.weight > best) {
        best = f.weight;
        bestField = f;
      }
      if (f.project) projectHits.set(f.project, (projectHits.get(f.project) ?? 0) + f.weight);
      if (e.skills.includes(f.source)) skills.add(f.source);
      if (e.expertise.includes(f.source)) expertise.add(f.source);
    }

    if (best > 0) {
      const s = Math.min(1, best + EXTRA_HIT * Math.min(3, exactFields - 1));
      total += s;
      evidence.push({ label: req.label, kind: "direct", source: bestField!.source });
      continue;
    }

    // No direct evidence: look for related work (a synonym), worth much less.
    let relWord = "";
    for (const f of fields) {
      const w = req.related.find((r) => hasWord(f.text, r));
      if (w && f.weight * RELATED > best) {
        best = f.weight * RELATED;
        bestField = f;
        relWord = w;
      }
    }
    if (best > 0) {
      total += best;
      if (bestField!.project) projectHits.set(bestField!.project, (projectHits.get(bestField!.project) ?? 0) + best / 2);
      evidence.push({ label: req.label, kind: "related", source: bestField!.source, via: relWord });
    } else {
      evidence.push({ label: req.label, kind: "missing" });
    }
  }

  const n = Math.max(1, q.reqs.length);
  let score = (total / n) * 0.95;
  const covered = evidence.filter((x) => x.kind !== "missing").length;
  const phraseHits = q.phrases.filter((p) => fields.some((f) => hasWord(f.text, p))).length;
  const genericHits = q.generic.filter((g) => fields.some((f) => hasWord(f.text, g))).length;
  if (covered) score += PHRASE_BONUS * Math.min(2, phraseHits) + 0.03 * Math.min(2, genericHits);

  const projects = [...projectHits.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  return {
    e,
    score,
    coverage: covered / n,
    direct: evidence.filter((x) => x.kind === "direct").length / n,
    evidence,
    projects,
    skills: [...skills],
    expertise: [...expertise],
  };
}

function buildReasons(r: Scored): string[] {
  const reasons: string[] = [];
  for (const p of r.projects.slice(0, 2)) {
    reasons.push(
      p.status === "current"
        ? `Currently **${roleCase(p.role)}** on **${p.name}**: ${lowerFirst(p.summary)}`
        : `Was **${roleCase(p.role)}** on **${p.name}** (${p.period}): ${lowerFirst(p.summary)}`,
    );
  }
  const skills = r.skills.slice(0, 3);
  const expertise = r.expertise.filter((x) => !skills.includes(x)).slice(0, 2);
  if (expertise.length) reasons.push(`Teammates go to them for ${listify(expertise)}`);
  else if (skills.length) reasons.push(`Hands-on experience with ${listify(skills)}`);
  if (reasons.length < 2) reasons.push(`Best for ${r.e.bestFor}`);
  return reasons.slice(0, 3);
}

/** Plain-English notes for anything this person is only loosely matched on. */
function buildGaps(r: Scored): string[] {
  return r.evidence
    .filter((x) => x.kind !== "direct")
    .map((x) =>
      x.kind === "related"
        ? `No direct **${x.label}** experience listed. Closest is related work on ${x.via} (${x.source}).`
        : `Nothing on their profile about **${x.label}**.`,
    );
}

// Lowercase a role for mid-sentence use, keeping acronyms like PM or GTM.
const roleCase = (role: string) =>
  role.split(" ").map((w) => (/^[A-Z]{2,}/.test(w) ? w : w.toLowerCase())).join(" ");
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
export const listify = (xs: string[]) =>
  xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;

export interface SearchResult {
  topic: string;
  parsed: ParsedQuery;
  results: Recommendation[];
  /** Requirements nobody in the whole directory has any evidence for. */
  unknown: string[];
  /** Requirements that are known, for "show me those instead". */
  known: string[];
  /** True when nobody covers every requirement and these are the closest people. */
  partial: boolean;
  /** People who cover only part of the question, and what they're missing. */
  near: { employeeId: string; missing: string[] }[];
}

const toRec = (r: Scored): Recommendation => ({
  employeeId: r.e.id,
  // Scaled so only near-perfect, multi-source evidence reaches the high 90s.
  relevance: Math.min(98, Math.round(r.score * 94)),
  reasons: buildReasons(r),
  evidence: r.evidence,
  gaps: buildGaps(r),
});

/**
 * Rank `people` for `query`. `universe` is the whole directory, used to tell a
 * topic nobody knows ("Hogwarts") apart from one that's just filtered out.
 */
export function recommend(
  query: string,
  people: Employee[],
  limit = 3,
  opts: { ignore?: Set<string>; universe?: Employee[] } = {},
): SearchResult {
  const parsed = parseQuery(query, opts.ignore);
  const topic = parsed.keywords.slice(0, 5).join(" ") || query;
  const empty = { topic, parsed, results: [], unknown: [] as string[], known: [] as string[], partial: false, near: [] };
  if (!parsed.reqs.length) return empty;

  const universe = opts.universe ?? people;
  let everyone = universe.map((e) => scoreEmployee(e, parsed));
  const unknownIdx = parsed.reqs.map((_, i) => i).filter((i) => everyone.every((s) => s.evidence[i].kind === "missing"));

  if (unknownIdx.length) {
    // An unknown word only matters if it names the topic: a proper noun
    // ("Hogwarts"), a qualifier on a known topic ("*people* analytics"), or
    // the whole question. Stray words ("the churn *numbers*") are ignored.
    const rest = query.split(/\s+/).slice(1).join(" ");
    const labels = parsed.reqs.map((r) => r.label);
    const blocking = unknownIdx.filter((i) => {
      const label = labels[i];
      const proper = new RegExp(`\\b${escape(label.charAt(0).toUpperCase() + label.slice(1))}`).test(rest);
      const next = parsed.keywords[parsed.keywords.indexOf(label) + 1];
      const modifies = !!next && labels.some((l, j) => !unknownIdx.includes(j) && l.split(" ")[0] === next);
      return proper || modifies || unknownIdx.length === parsed.reqs.length;
    });
    if (blocking.length) {
      return { ...empty, unknown: blocking.map((i) => labels[i]), known: labels.filter((_, i) => !unknownIdx.includes(i)) };
    }
    parsed.reqs = parsed.reqs.filter((_, i) => !unknownIdx.includes(i));
    everyone = universe.map((e) => scoreEmployee(e, parsed));
  }
  const known = parsed.reqs.map((r) => r.label);

  const ids = new Set(people.map((p) => p.id));
  // Someone matched only through synonyms is never presented as a match.
  const scored = everyone
    .filter((s) => ids.has(s.e.id) && s.direct > 0)
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage);
  const full = scored.filter((s) => s.coverage === 1);

  if (full.length) {
    const top = full[0].score;
    // Everyone with direct evidence for every part, plus anyone nearly as strong.
    const kept = full
      .filter((s) => s.score >= MIN_SCORE && (s.direct === 1 || s.score >= top - 0.15))
      .slice(0, limit);
    const near = scored
      .filter((s) => s.coverage < 1 && s.score >= 0.3)
      .slice(0, 2)
      .map((s) => ({ employeeId: s.e.id, missing: s.evidence.filter((x) => x.kind === "missing").map((x) => x.label) }));
    return { ...empty, results: kept.map(toRec), known, near };
  }

  // Nobody covers everything: show who comes closest, and say so.
  const best = Math.max(0, ...scored.map((s) => s.coverage));
  const closest = scored.filter((s) => s.coverage === best && best >= 0.5).slice(0, Math.min(limit, 2));
  return { ...empty, results: closest.map(toRec), known, partial: closest.length > 0 };
}

/** Score specific people against a question (used for follow-ups and comparisons). */
export function scorePeople(query: string, people: Employee[], ignore?: Set<string>) {
  const parsed = parseQuery(query, ignore);
  return people.map((e) => {
    const s = parsed.reqs.length ? scoreEmployee(e, parsed) : undefined;
    return { e, score: s?.score ?? 0, coverage: s?.coverage ?? 0, rec: s ? toRec(s) : undefined };
  });
}
