import { employees, getEmployee } from "@/data/employees";
import { ME, collaborations, myCollaborations } from "@/data/network";
import type { Employee } from "@/lib/types";

// Degrees of separation between you and a colleague, and who can introduce you.
// 1st: you've worked together. 2nd: a mutual contact can introduce you.
// 3rd: a chain of two people. null: no known path, so reach out directly.

/** "how" reads as a sentence fragment: "Maya and Priya <how>". */
type Graph = Map<string, Map<string, string>>;

function buildGraph(): Graph {
  const g: Graph = new Map();
  const link = (a: string, b: string, how: string) => {
    if (a === b) return;
    if (!g.has(a)) g.set(a, new Map());
    if (!g.has(b)) g.set(b, new Map());
    // Explicit context beats "worked on X together".
    if (!g.get(a)!.has(b) || !how.startsWith("worked on")) {
      g.get(a)!.set(b, how);
      g.get(b)!.set(a, how);
    }
  };
  // Shared projects in the directory.
  for (const a of employees)
    for (const b of employees)
      if (a.id < b.id)
        for (const p of a.projects)
          if (b.projects.some((q) => q.name === p.name)) link(a.id, b.id, `worked on ${p.name} together`);
  for (const c of [...myCollaborations, ...collaborations]) link(c.a, c.b, c.how);
  return g;
}

const graph = buildGraph();

export interface Mutual {
  /** Your direct contact who knows them. */
  via: Employee;
  /** How `via` knows the target. */
  how: string;
  /** How you know `via`. */
  howYou: string;
}

export interface Connection {
  degree: 1 | 2 | 3 | null;
  /** 1st degree: how you know them. */
  how?: string;
  /** 2nd degree: everyone you both know. */
  mutuals: Mutual[];
  /** 3rd degree: you → path[0] → path[1] → them. */
  path?: Employee[];
}

const cache = new Map<string, Connection>();

export function connectionTo(employeeId: string): Connection {
  const hit = cache.get(employeeId);
  if (hit) return hit;
  const mine = graph.get(ME) ?? new Map<string, string>();
  const theirs = graph.get(employeeId) ?? new Map<string, string>();
  let result: Connection;

  if (mine.has(employeeId)) {
    result = { degree: 1, how: mine.get(employeeId), mutuals: [] };
  } else {
    const mutuals = [...theirs.entries()]
      .filter(([id]) => mine.has(id))
      .map(([id, how]) => ({ via: getEmployee(id)!, how, howYou: mine.get(id)! }))
      .filter((m) => m.via);
    if (mutuals.length) {
      result = { degree: 2, mutuals };
    } else {
      // Look one step further: you → a → b → them.
      let path: Employee[] | undefined;
      for (const a of mine.keys()) {
        for (const b of graph.get(a)?.keys() ?? []) {
          if (b !== ME && theirs.has(b)) {
            path = [getEmployee(a)!, getEmployee(b)!];
            break;
          }
        }
        if (path) break;
      }
      result = path ? { degree: 3, mutuals: [], path } : { degree: null, mutuals: [] };
    }
  }
  cache.set(employeeId, result);
  return result;
}

export const degreeLabel = (d: Connection["degree"]) =>
  d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : "Not connected";
