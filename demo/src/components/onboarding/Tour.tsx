"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { company, tourScenario } from "@/data/workspace";
import { CHILLA_DM } from "@/lib/chilla";
import { toISODate, weekdayFromToday } from "@/lib/dates";
import { useHydrated } from "@/lib/storage";
import { TOUR_STEPS, tourProgress } from "@/lib/tour";
import { Mascot } from "@/components/ui/Mascot";
import { Modal } from "@/components/ui/Modal";
import { RichText } from "@/components/ui/RichText";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

// Same site: the demo is served at /demo by the landing page.
const LANDING_URL = "/?utm_source=demo#join";

/** Live tour progress, derived from what the user has actually done. */
function useTour() {
  const ws = useWorkspace();
  const progress = tourProgress({
    integrations: ws.integrations,
    onboarded: ws.onboarded,
    events: ws.events,
    meetings: ws.meetings,
    nudges: ws.nudges,
    incoming: ws.incoming,
  });
  return { ...ws, ...progress };
}

// ---------- first screen ----------

export function WelcomeModal() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { tourStatus, startTour, skipTour, profile } = useWorkspace();
  const open = hydrated && tourStatus === "new";

  return (
    <Modal open={open} onClose={() => skipTour()} title={`Welcome to ${company.name}'s Slack 👋`}>
      <div className="text-center">
        <Mascot className="mx-auto h-24 w-24" />
        <p className="mt-3 text-lg">
          You&apos;re <b>{profile.name}</b>, a PM at {company.name}. Your team just got approval to try <span className="font-bold">Chilla</span>.
        </p>
        <p className="mt-1 text-sm text-muted">In about 3 minutes you&apos;ll run the whole thing, start to finish:</p>
      </div>
      <ol className="mt-4 grid gap-1.5 text-sm sm:grid-cols-2">
        {TOUR_STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2 rounded-lg border-[1.5px] border-dashed border-ear px-2.5 py-1.5">
            <span className="font-hand text-xl leading-none font-bold text-nose">{i + 1}</span> {s.title}
          </li>
        ))}
      </ol>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <button
          className="btn btn-blue flex-1"
          onClick={() => {
            startTour();
            router.push("/apps");
          }}
        >Start the guided tour
        </button>
        <button
          className="btn btn-ghost flex-1"
          onClick={() => {
            skipTour();
            router.push("/");
          }}
        >
          Skip, set it up for me
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Everything here is simulated. Nothing leaves your browser.</p>
    </Modal>
  );
}

// ---------- the floating coach ----------

export function TourGuide() {
  const router = useRouter();
  const hydrated = useHydrated();
  const t = useTour();
  // Start tucked away on phones, where it would cover the message box.
  const [collapsed, setCollapsed] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const step = t.current;
  const active = hydrated && t.tourStatus === "active" && !!step;
  const target = active ? step.target : null;

  // Pulse the element the current step is about. Re-applied on an interval
  // because the target may only appear after navigation or a reply.
  useEffect(() => {
    const clear = () => document.querySelectorAll(".tour-pulse").forEach((el) => el.classList.remove("tour-pulse"));
    if (!target) return clear;
    const apply = () => {
      const els = [...document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)].filter((el) => el.offsetParent);
      const el = els[els.length - 1];
      document.querySelectorAll(".tour-pulse").forEach((x) => x !== el && x.classList.remove("tour-pulse"));
      el?.classList.add("tour-pulse");
    };
    apply();
    const id = window.setInterval(apply, 500);
    return () => {
      window.clearInterval(id);
      clear();
    };
  }, [target]);

  if (!active || !step) return null;
  const n = TOUR_STEPS.indexOf(step) + 1;

  const go = () => {
    router.push(step.href);
    window.setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`);
      els[els.length - 1]?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 450);
  };

  const waiting = step.id === "respond" && t.incoming.length === 0;

  return (
    <aside
      className="fixed right-3 bottom-3 z-40 w-[min(22rem,calc(100vw-1.5rem))] animate-pop md:right-8 md:bottom-40"
      aria-label="Guided tour"
    >
      <div className="card overflow-hidden bg-white">
        <button
          className="flex w-full items-center gap-2 border-b-2 border-ink bg-ink px-3 py-2 text-left text-sm font-bold text-white"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <Mascot className="h-6 w-6" />
          Guided tour · step {n} of {t.total}
          <span className="ml-auto">{collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</span>
        </button>
        <div className="flex h-1.5 bg-belly">
          <div className="bg-nose transition-all" style={{ width: `${(t.doneCount / t.total) * 100}%` }} />
        </div>
        {!collapsed && (
          <div className="p-4">
            <p className="text-lg leading-tight font-extrabold">{step.title}</p>
            <p className="mt-1.5 text-sm text-muted">
              <RichText text={step.body} />
            </p>

            {step.id === "search" && (
              <button className="chip mt-3 w-full bg-blue-soft text-left hover:bg-blue hover:text-white" onClick={() => { router.push("/"); t.sendMessage(CHILLA_DM, tourScenario.query); }}>Ask: “{tourScenario.query}”
              </button>
            )}
            {step.id === "nudge" && (
              <button
                className="chip mt-3 w-full bg-blue-soft text-left hover:bg-blue hover:text-white"
                onClick={() => {
                  const { inWeekdays, ...rest } = tourScenario.nudge;
                  t.openNudge({ ...rest, due: toISODate(weekdayFromToday(inWeekdays)) });
                }}
              >Try: nudge Dev for the load test results
              </button>
            )}
            {waiting && (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold">
                <Loader2 size={15} className="animate-spin" /> A teammate is about to nudge you…
              </p>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <button className="text-xs font-semibold text-muted underline hover:text-ink" onClick={() => t.skipTour()}>
                Skip tour
              </button>
              {!waiting && (
                <button className="btn btn-sm" onClick={go}>
                  Take me there <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

// ---------- the finish line ----------

export function TourComplete() {
  const hydrated = useHydrated();
  const t = useTour();
  const open = hydrated && t.tourStatus === "active" && t.finished;

  return (
    <Modal open={open} onClose={t.finishTour} title="That's the whole loop 🎉">
      <div className="text-center">
        <Mascot className="mx-auto h-24 w-24" />
        <p className="mt-2 text-lg font-bold">
          You went from “who owns this?” to a booked meeting and a follow-up, without leaving Slack.
        </p>
      </div>
      <ul className="mt-4 space-y-1 text-sm">
        {TOUR_STEPS.map((s) => (
          <li key={s.id} className="flex items-center gap-2">
            <span className="grid h-5 w-5 place-items-center rounded-full border-[1.5px] border-ink bg-mint"><Check size={12} strokeWidth={3} /></span>
            {s.title}
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-blue-soft px-3 py-2 text-sm">
        <b>Keep exploring:</b> type <code className="rounded bg-white px-1">/chilla</code> in any channel, filter the Directory, or check your <b>Home</b> tab.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <a className="btn btn-blue flex-1" href={LANDING_URL} onClick={t.finishTour}>
          Join the pilot: $15/mo
        </a>
        <button className="btn btn-ghost flex-1" onClick={t.finishTour}>
          Explore on my own
        </button>
      </div>
    </Modal>
  );
}
