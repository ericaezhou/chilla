// Date helpers for the demo. "Today" is the real current date.

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** The next `count` weekdays, starting tomorrow. */
export function nextWeekdays(count: number, from = new Date()) {
  const days: Date[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (days.length < count) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days.push(new Date(d));
  }
  return days;
}

export function formatTimeLabel(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")}${suffix}`;
}

export function formatMeetingWhen(date: string, time: string) {
  const d = fromISODate(date);
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, ${formatTimeLabel(time)}`;
}

/** Deterministic fake calendar: which half-hour slots a person is free on a day. */
export function slotsFor(employeeId: string, date: string, start = "09:00", end = "17:00") {
  const toMin = (t: string) => Number(t.split(":")[0]) * 60 + Number(t.split(":")[1]);
  const slots: { time: string; free: boolean }[] = [];
  let seed = 0;
  for (const c of employeeId + date) seed = (seed * 33 + c.charCodeAt(0)) >>> 0;
  for (let m = toMin(start); m < toMin(end); m += 30) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    slots.push({ time, free: seed % 100 > 38 && !(m >= 720 && m < 780) });
  }
  return slots;
}

/** The weekday `n` weekdays after today (n = 0 is today, or the next weekday). */
export function weekdayFromToday(n: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  for (let i = 0; i < n; i++) {
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  }
  return d;
}

/** "Thu, Nov 12" */
export function formatDay(date: string) {
  return fromISODate(date).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/** "today", "tomorrow", or "Thu, Nov 12" */
export function relativeDay(date: string, from = new Date()) {
  const today = toISODate(from);
  const tomorrow = toISODate(new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1));
  if (date === today) return "today";
  if (date === tomorrow) return "tomorrow";
  return formatDay(date);
}

const MY_EVENTS = [
  "Spend controls standup",
  "1:1 with Maya",
  "Sprint planning",
  "Customer call: Acme Corp",
  "Design review",
  "Focus time",
  "Roadmap sync",
];

/** Your own (fake) synced calendar: busy half-hour slots and what's in them. */
export function myCalendar(date: string, start = "09:00", end = "17:00") {
  const busy = new Map<string, string>();
  let seed = 7;
  for (const c of "me" + date) seed = (seed * 31 + c.charCodeAt(0)) >>> 0;
  for (const s of slotsFor("me", date, start, end)) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    if (s.time === "09:30") busy.set(s.time, MY_EVENTS[0]);
    else if (seed % 100 < 22) busy.set(s.time, MY_EVENTS[1 + (seed % (MY_EVENTS.length - 1))]);
  }
  return busy;
}
