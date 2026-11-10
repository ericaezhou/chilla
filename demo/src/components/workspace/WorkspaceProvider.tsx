"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getEmployee } from "@/data/employees";
import {
  defaultProfile,
  defaultSettings,
  dmReplies,
  incomingNudgeSeed,
  seededChannelMessages,
  slackProfile,
} from "@/data/workspace";
import {
  CHILLA_DM,
  HELP_TEXT,
  chillaText,
  dmEmployeeId,
  dmId,
  mentionsChilla,
  parseSlash,
  personText,
  respond,
  systemText,
  uid,
  userText,
  welcomeMessages,
  type SlashCommand,
} from "@/lib/chilla";
import { toISODate, weekdayFromToday } from "@/lib/dates";
import { REPLY_STATUS, firstName, replyFor } from "@/lib/nudges";
import { readStored, updateStored, usePersistentState } from "@/lib/storage";
import type { TourEvent } from "@/lib/tour";
import type {
  CalendarProvider,
  ChatMessage,
  IncomingNudge,
  Integrations,
  MeetingRequest,
  Nudge,
  SearchFilters,
  Settings,
  UserProfile,
} from "@/lib/types";

// Global workspace state: chat, onboarding, nudges, the side panel, modals,
// toasts and persisted user data. Anything in the app can call useWorkspace().

const EMPTY: ChatMessage[] = [];
const NO_MEETINGS: MeetingRequest[] = [];
const NO_NUDGES: Nudge[] = [];
const NO_INCOMING: IncomingNudge[] = [];
const NO_EVENTS: TourEvent[] = [];
const NO_REACTIONS: Record<string, string[]> = {};
const NOT_INSTALLED: Integrations = { slack: false, channels: [], calendar: null };
/** new → (active | skipped) → celebrated */
type TourStatus = "new" | "active" | "skipped" | "celebrated";
const NEW_TOUR: { status: TourStatus } = { status: "new" };

export const chatKey = (convId: string) => `chat:${convId}`;
export const chatFallback = (convId: string) => seededChannelMessages[convId] ?? EMPTY;

interface MeetingTarget {
  employeeId: string;
  /** The topic Chilla recommended this person for, used to prefill the purpose. */
  context?: string;
}

export interface NudgeTarget {
  employeeId?: string;
  ask?: string;
  due?: string;
  milestoneId?: string;
}

export type NudgeInput = Omit<Nudge, "id" | "createdAt" | "status" | "reply">;
export type OnboardingModal = "install" | "calendar" | "profile-setup" | null;

interface WorkspaceCtx {
  profile: UserProfile;
  setProfile: (p: UserProfile) => void;
  settings: Settings;
  setSettings: (s: Settings) => void;
  meetings: MeetingRequest[];

  integrations: Integrations;
  onboarded: boolean;
  installChilla: (channels: string[]) => void;
  connectCalendar: (provider: CalendarProvider) => void;
  disconnectCalendar: () => void;
  completeProfile: (p: UserProfile) => void;
  modal: OnboardingModal;
  setModal: (m: OnboardingModal) => void;

  tourStatus: TourStatus;
  startTour: () => void;
  skipTour: () => void;
  finishTour: () => void;
  events: TourEvent[];
  trackEvent: (e: TourEvent) => void;

  typing: Record<string, boolean>;
  sendMessage: (convId: string, text: string) => void;
  refineSearch: (convId: string, query: string, filters: SearchFilters, ephemeral?: boolean) => void;
  reactions: Record<string, string[]>;
  toggleReaction: (msgId: string, emoji: string) => void;

  profilePanelId: string | null;
  openProfile: (id: string) => void;
  closeProfile: () => void;

  meetingTarget: MeetingTarget | null;
  openMeeting: (employeeId: string, context?: string) => void;
  closeMeeting: () => void;
  submitMeeting: (m: Omit<MeetingRequest, "id" | "createdAt" | "status">) => MeetingRequest;

  nudges: Nudge[];
  incoming: IncomingNudge[];
  nudgeTarget: NudgeTarget | null;
  openNudge: (t?: NudgeTarget) => void;
  closeNudge: () => void;
  createNudge: (n: NudgeInput) => Nudge;
  respondToNudge: (id: string, response: NonNullable<IncomingNudge["response"]>) => void;

  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<WorkspaceCtx | null>(null);

export function useWorkspace() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return ctx;
}

const append = (convId: string, ...msgs: ChatMessage[]) =>
  updateStored(chatKey(convId), chatFallback(convId), (prev) => [...prev, ...msgs]);

const patchNudge = (id: string, patch: Partial<Nudge>) =>
  updateStored("nudges", NO_NUDGES, (prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = usePersistentState("profile", slackProfile);
  const [settings, setSettings] = usePersistentState("settings", defaultSettings);
  const [meetings] = usePersistentState("meetings", NO_MEETINGS);
  const [integrations] = usePersistentState("integrations", NOT_INSTALLED);
  const [onboarded] = usePersistentState("onboarded", false);
  const [nudges] = usePersistentState("nudges", NO_NUDGES);
  const [incoming] = usePersistentState("incoming", NO_INCOMING);
  const [events] = usePersistentState("events", NO_EVENTS);
  const [tour, setTour] = usePersistentState("tour", NEW_TOUR);
  const [reactions] = usePersistentState("reactions", NO_REACTIONS);

  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [profilePanelId, setProfilePanelId] = useState<string | null>(null);
  const [meetingTarget, setMeetingTarget] = useState<MeetingTarget | null>(null);
  const [nudgeTarget, setNudgeTarget] = useState<NudgeTarget | null>(null);
  const [modal, setModal] = useState<OnboardingModal>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 2600);
  }, []);

  const trackEvent = useCallback((e: TourEvent) => {
    updateStored("events", NO_EVENTS, (prev) => (prev.includes(e) ? prev : [...prev, e]));
  }, []);

  /** Show a typing indicator in a conversation, then post. */
  const typeThen = useCallback((convId: string, delay: number, post: () => void) => {
    setTyping((t) => ({ ...t, [convId]: true }));
    window.setTimeout(() => {
      post();
      setTyping((t) => ({ ...t, [convId]: false }));
    }, delay);
  }, []);

  const postChillaReplies = useCallback(
    (convId: string, replies: ChatMessage[]) => {
      typeThen(convId, 900 + Math.random() * 600, () => {
        append(convId, ...replies);
        if (replies.some((r) => r.kind === "recommendations")) trackEvent("search");
      });
    },
    [typeThen, trackEvent],
  );

  // ---------- onboarding ----------

  const installChilla = useCallback((channels: string[]) => {
    const name = readStored("profile", slackProfile).name;
    updateStored("integrations", NOT_INSTALLED, (prev) => ({ ...prev, slack: true, channels }));
    append(CHILLA_DM, ...welcomeMessages(firstName(name)));
    for (const c of channels) append(c, systemText(`**Chilla** joined #${c}. Added by ${name}.`));
  }, []);

  const connectCalendar = useCallback((provider: CalendarProvider) => {
    updateStored("integrations", NOT_INSTALLED, (prev) => ({ ...prev, calendar: provider }));
    const label = provider === "google" ? "Google Calendar" : "Outlook Calendar";
    append(
      CHILLA_DM,
      chillaText(`📅 **${label}** connected. I only read free/busy times, and I'll only add events you confirm.`),
    );
  }, []);

  const disconnectCalendar = useCallback(() => {
    updateStored("integrations", NOT_INSTALLED, (prev) => ({ ...prev, calendar: null }));
  }, []);

  const completeProfile = useCallback(
    (p: UserProfile) => {
      setProfile(p);
      if (readStored("onboarded", false)) return;
      updateStored("onboarded", false, () => true);
      append(
        CHILLA_DM,
        chillaText(
          `✅ Your profile is live, ${firstName(p.name)}. Teammates who ask about ${p.skills.slice(0, 2).join(" or ") || "your work"} can now find you, and you're listed in the **Directory**.`,
        ),
      );
    },
    [setProfile],
  );

  // ---------- nudges ----------

  const timers = useRef(new Set<string>());

  /** A teammate's Chilla checks in with you. Only ever seeded once. */
  const ensureIncoming = useCallback(() => {
    if (readStored("incoming", NO_INCOMING).length) return;
    const { inWeekdays, ...seed } = incomingNudgeSeed;
    const n: IncomingNudge = {
      ...seed,
      id: uid(),
      due: toISODate(weekdayFromToday(inWeekdays)),
      createdAt: new Date().toISOString(),
    };
    updateStored("incoming", NO_INCOMING, (prev) => [n, ...prev]);
    append(CHILLA_DM, { id: uid(), kind: "incoming-nudge", author: "chilla", ts: n.createdAt, incomingId: n.id });
    const from = getEmployee(n.fromId);
    if (from) showToast(`🔔 New nudge from ${firstName(from.name)} in your Chilla DM`);
  }, [showToast]);

  /**
   * Walk a nudge through its life: Chilla sends it as you, the person replies,
   * Chilla reports back. Safe to call again after a reload; it picks up where
   * the nudge left off.
   */
  const runNudge = useCallback(
    (nudge: Nudge) => {
      if (nudge.status === "replied" || timers.current.has(nudge.id)) return;
      const person = getEmployee(nudge.employeeId);
      if (!person) return;
      timers.current.add(nudge.id);
      const conv = dmId(person.id);

      const reply = () =>
        typeThen(conv, 2200, () => {
          const r = replyFor(person.id, nudge.due);
          append(conv, personText(person.id, r.text));
          patchNudge(nudge.id, { status: "replied", reply: { ...r, at: new Date().toISOString() } });
          const s = REPLY_STATUS[r.status];
          append(
            CHILLA_DM,
            chillaText(`📬 **${firstName(person.name)}** replied to your nudge: ${s.emoji} **${s.label}**\n“${r.text}”`),
          );
          timers.current.delete(nudge.id);
          // After your first nudge round-trips, someone nudges you back.
          window.setTimeout(ensureIncoming, 3500);
        });

      if (nudge.status === "sending") {
        window.setTimeout(() => {
          append(conv, userText(nudge.message, "chilla"));
          patchNudge(nudge.id, { status: "sent" });
          window.setTimeout(reply, 2500);
        }, 1400);
      } else {
        window.setTimeout(reply, 1500);
      }
    },
    [typeThen, ensureIncoming],
  );

  // Resume anything that was mid-flight when the page was reloaded.
  useEffect(() => {
    for (const n of readStored("nudges", NO_NUDGES)) runNudge(n);
  }, [runNudge]);

  const createNudge = useCallback(
    (input: NudgeInput) => {
      const nudge: Nudge = { ...input, id: uid(), createdAt: new Date().toISOString(), status: "sending" };
      updateStored("nudges", NO_NUDGES, (prev) => [nudge, ...prev]);
      append(CHILLA_DM, { id: uid(), kind: "nudge", author: "chilla", ts: nudge.createdAt, nudgeId: nudge.id });
      runNudge(nudge);
      return nudge;
    },
    [runNudge],
  );

  const respondToNudge = useCallback<WorkspaceCtx["respondToNudge"]>(
    (id, response) => {
      const n = readStored("incoming", NO_INCOMING).find((x) => x.id === id);
      const from = n && getEmployee(n.fromId);
      if (!n || !from) return;
      updateStored("incoming", NO_INCOMING, (prev) => prev.map((x) => (x.id === id ? { ...x, response } : x)));
      const s = REPLY_STATUS[response.status];
      const detail = response.note ? `: ${response.note}` : "";
      const conv = dmId(from.id);
      append(conv, userText(`${s.emoji} ${s.label} on “${n.ask}”${detail}`, "chilla"));
      append(CHILLA_DM, chillaText(`Got it. I let **${firstName(from.name)}** know you're **${s.label.toLowerCase()}**. 🫶`));
      typeThen(conv, 2000, () =>
        append(
          conv,
          personText(from.id, response.status === "blocked" ? "Ah, thanks for flagging! Let's grab 10 min to unblock it." : "Thank you! 🙏"),
        ),
      );
    },
    [typeThen],
  );

  // ---------- chat ----------

  const runSlash = useCallback(
    (convId: string, cmd: SlashCommand) => {
      const ephemeral = convId !== CHILLA_DM;
      switch (cmd.name) {
        case "find":
          if (!cmd.query) {
            append(convId, chillaText("Tell me who you're looking for, e.g. `/chilla find SSO migration`.", { ephemeral: true }));
            return;
          }
          postChillaReplies(convId, respond(cmd.query, { settings, ephemeral }));
          return;
        case "nudge":
          setNudgeTarget({ employeeId: cmd.employeeId, ask: cmd.ask });
          return;
        case "meet":
          if (cmd.employeeId) setMeetingTarget({ employeeId: cmd.employeeId });
          else append(convId, chillaText("Who with? Try `/chilla meet @priya`.", { ephemeral: true }));
          return;
        case "profile":
          setModal("profile-setup");
          return;
        case "help":
          append(convId, chillaText(HELP_TEXT, { ephemeral: true }));
      }
    },
    [settings, postChillaReplies],
  );

  const sendMessage = useCallback(
    (convId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const installed = readStored("integrations", NOT_INSTALLED).slack;

      if (trimmed.startsWith("/")) {
        const cmd = parseSlash(trimmed);
        if (cmd && installed) runSlash(convId, cmd);
        else
          append(convId, {
            ...systemText(`\`${trimmed.split(/\s/)[0]}\` isn't a command in this workspace yet. Add Chilla from **Apps** first.`),
            ephemeral: true,
          });
        return;
      }

      append(convId, userText(trimmed));

      const person = dmEmployeeId(convId);
      if (person) {
        const count = readStored(chatKey(convId), EMPTY).length;
        typeThen(convId, 1400 + Math.random() * 800, () =>
          append(convId, personText(person, dmReplies[count % dmReplies.length])),
        );
        return;
      }
      if (!installed) return;
      if (convId !== CHILLA_DM && !mentionsChilla(trimmed)) return;
      // Simulate Chilla "thinking" across the org graph before answering.
      postChillaReplies(convId, respond(trimmed, { settings }));
    },
    [settings, runSlash, typeThen, postChillaReplies],
  );

  const refineSearch = useCallback<WorkspaceCtx["refineSearch"]>(
    (convId, query, filters, ephemeral) => postChillaReplies(convId, respond(query, { settings, filters, ephemeral })),
    [settings, postChillaReplies],
  );

  const toggleReaction = useCallback((msgId: string, emoji: string) => {
    updateStored("reactions", NO_REACTIONS, (prev) => {
      const mine = prev[msgId] ?? [];
      return { ...prev, [msgId]: mine.includes(emoji) ? mine.filter((x) => x !== emoji) : [...mine, emoji] };
    });
  }, []);

  // ---------- meetings ----------

  const submitMeeting = useCallback<WorkspaceCtx["submitMeeting"]>((m) => {
    const meeting: MeetingRequest = {
      ...m,
      id: uid(),
      createdAt: new Date().toISOString(),
      status: "pending",
    };
    updateStored("meetings", NO_MEETINGS, (prev) => [meeting, ...prev]);
    append(CHILLA_DM, { id: uid(), kind: "meeting", author: "chilla", ts: meeting.createdAt, meetingId: meeting.id });

    // Simulate the colleague accepting a few seconds later.
    window.setTimeout(() => {
      updateStored("meetings", NO_MEETINGS, (prev) =>
        prev.map((x) => (x.id === meeting.id ? { ...x, status: "accepted" } : x)),
      );
      const person = getEmployee(m.employeeId);
      if (person) {
        const where = m.onCalendar ? "It's on both of your calendars now." : "Add it to your calendar so you don't miss it.";
        append(CHILLA_DM, chillaText(`🎉 **${firstName(person.name)}** accepted your meeting request. ${where}`));
      }
    }, 6000);
    return meeting;
  }, []);

  // ---------- tour ----------

  const startTour = useCallback(() => setTour({ status: "active" }), [setTour]);
  const finishTour = useCallback(() => setTour({ status: "celebrated" }), [setTour]);

  /** Skip the walkthrough: set everything up with sensible defaults. */
  const skipTour = useCallback(() => {
    if (!readStored("integrations", NOT_INSTALLED).slack) installChilla(["launch-q4"]);
    updateStored("integrations", NOT_INSTALLED, (prev) => ({ ...prev, calendar: prev.calendar ?? "google" }));
    if (!readStored("onboarded", false)) {
      setProfile(defaultProfile);
      updateStored("onboarded", false, () => true);
    }
    setTour({ status: "skipped" });
    window.setTimeout(ensureIncoming, 2500);
  }, [installChilla, setProfile, setTour, ensureIncoming]);

  const value = useMemo<WorkspaceCtx>(
    () => ({
      profile,
      setProfile,
      settings,
      setSettings,
      meetings,
      integrations,
      onboarded,
      installChilla,
      connectCalendar,
      disconnectCalendar,
      completeProfile,
      modal,
      setModal,
      tourStatus: tour.status,
      startTour,
      skipTour,
      finishTour,
      events,
      trackEvent,
      typing,
      sendMessage,
      refineSearch,
      reactions,
      toggleReaction,
      profilePanelId,
      openProfile: setProfilePanelId,
      closeProfile: () => setProfilePanelId(null),
      meetingTarget,
      openMeeting: (employeeId, context) => setMeetingTarget({ employeeId, context }),
      closeMeeting: () => setMeetingTarget(null),
      submitMeeting,
      nudges,
      incoming,
      nudgeTarget,
      openNudge: (t) => setNudgeTarget(t ?? {}),
      closeNudge: () => setNudgeTarget(null),
      createNudge,
      respondToNudge,
      sidebarOpen,
      setSidebarOpen,
      toast,
      showToast,
    }),
    [
      profile, setProfile, settings, setSettings, meetings, integrations, onboarded, installChilla, connectCalendar,
      disconnectCalendar, completeProfile, modal, tour.status, startTour, skipTour, finishTour, events, trackEvent,
      typing, sendMessage, refineSearch, reactions, toggleReaction, profilePanelId, meetingTarget, submitMeeting,
      nudges, incoming, nudgeTarget, createNudge, respondToNudge, sidebarOpen, toast, showToast,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Messages for one conversation, persisted per conversation id. */
export function useConversation(convId: string) {
  const [messages] = usePersistentState(chatKey(convId), chatFallback(convId));
  return messages;
}
