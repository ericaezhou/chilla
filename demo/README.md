# Chilla: interactive demo

An interactive prototype of **Chilla**, the PM's sidekick that tells you who to ask. It runs inside a **simulated Slack workspace** and matches the branding of our landing page ([chilla-azure.vercel.app](https://chilla-azure.vercel.app/)).

Nothing is real. Slack, calendars and the AI are all simulated with mock data for a fictional company, **Fernway**. User edits are saved to `localStorage`.

## The demo flow

First-time visitors get a **guided tour** (a floating coach in the corner that pulses whatever to click next). Each step completes when the user actually does it:

1. **Add Chilla to Slack**: App Directory listing → permissions screen → pick channels. Chilla joins them and DMs a setup checklist.
2. **Connect your calendar** (Google or Outlook, simulated): free/busy only.
3. **Fill out your profile**: pre-filled from Slack, with one-click project and skill suggestions and a preview of how you'll appear in results.
4. **Browse the directory** and open someone's profile. You're listed too once your profile is live.
5. **Ask who to talk to**: get the top people with reasons, then **narrow it down** by department, "available now", or "show other people".
6. **Book time**: the meeting modal compares your calendar with theirs, marks slots you're both free, and suggests one.
7. **Nudge a cross-functional POC**: ask, due date, linked milestone (warns if the date lands after it), follow-up cadence and tone. Chilla messages them **as you**, they reply in your DM, and Chilla reports back.
8. **Respond to a nudge**: a teammate's Chilla checks in with you; answer Done / On track / Need more time / Blocked in one click.

After that (or after **Skip, set it up for me**), everything is free to explore: `/chilla` slash commands in any message box, DMs with colleagues, emoji reactions, the **Home** tab (delivery timeline, meetings, connections) and the **Nudges** tab. Restart the tour from the top-right link, Help, or Settings → Reset.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000/demo
```

`npm run build && npm start` runs a production build. `npm run lint` runs the linter.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 and lucide-react icons. There is no backend.

## Project structure

```
src/
  app/                    Routes only (thin pages)
    layout.tsx            Fonts + WorkspaceProvider + Slack window shell
    (chilla)/             Chilla app tabs, sharing one header (gated until installed)
      page.tsx            Messages (the Chilla DM)
      home/ nudges/ directory/ meetings/ profile/ settings/ help/
    apps/                 Slack App Directory listing (tour starts here)
    c/[slug]/             Slack channels (#launch-q4, …)
    dm/[id]/              Direct messages with colleagues
  components/
    ui/                   Brand primitives: Avatar, Mascot, Modal, Toggle, RichText
    workspace/            Slack chrome: TopBar, WorkspaceRail, Sidebar, ChillaHeader (+ ChillaGate), WorkspaceProvider (global state)
    chat/                 ChatView, DMView, Message, Composer (slash menu), RecommendationCard, RefineBar,
                          SetupCard, NudgeCards, MeetingNotice
    onboarding/           AppDirectory, InstallModal, CalendarModal, ProfileSetupModal, Tour (welcome, guide, finish)
    nudges/               NudgeModal (compose), NudgesView (the Nudges tab)
    home/                 AppHome (the Home tab)
    people/               ProfilePanel, EmployeeCard, ProfileEditor, ProjectList
    meeting/              MeetingModal (form + confirmation)
  data/                   ALL mock data. Edit here, not in components
    employees.ts          The 15 Fernway employees
    workspace.ts          Company, channels, seeded messages, prompts, default user/settings,
                          Slack profile, milestones, nudge replies, tour scenario, slash commands
  lib/
    search/engine.ts      Recommendation ranking + "why" explanations
    search/concepts.ts    Synonym groups (teach search new vocabulary here)
    chilla.ts             Bot replies (greetings, recommendations, filters) + /chilla command parsing
    nudges.ts             Draft a nudge, milestone cross-check, reply statuses
    tour.ts               Tour steps; each one is "done" based on app state
    storage.ts            usePersistentState: localStorage-backed state
    dates.ts              Date helpers + the fake calendar
    types.ts              Shared types
```

## Common changes

| I want to… | Edit |
| --- | --- |
| Add or change a person | `src/data/employees.ts` (search, the directory and profiles update automatically) |
| Make search understand a new term | Add it to a group in `src/lib/search/concepts.ts` |
| Tune ranking | `FIELD_WEIGHTS` and related constants in `src/lib/search/engine.ts` |
| Change what Chilla says | `src/lib/chilla.ts` |
| Change brand colors or fonts | The `@theme` block in `src/app/globals.css` (classes like `bg-ink` and `shadow-brutal` follow) |
| Restyle buttons, cards, pills | `@layer components` in `src/app/globals.css` (`.btn`, `.card`, `.pill`, `.chip`, `.input`) |
| Add a Chilla tab | Add it to `CHILLA_TABS` in `components/workspace/ChillaHeader.tsx`, then create `src/app/(chilla)/<tab>/page.tsx` |
| Add a channel | `channels` + `seededChannelMessages` in `src/data/workspace.ts` |
| Open a profile or meeting from anywhere | `const { openProfile, openMeeting } = useWorkspace()` |
| Open the nudge composer from anywhere | `openNudge({ employeeId, ask })` from `useWorkspace()` |
| Change a tour step | `TOUR_STEPS` in `src/lib/tour.ts`; put `data-tour="<target>"` on the element to highlight |
| Change how someone answers a nudge | `nudgeReplies` in `src/data/workspace.ts` |
| Add a milestone to the delivery timeline | `milestones` in `src/data/workspace.ts` (dates are relative to today) |
| Add a slash command | `slashCommands` in `src/data/workspace.ts` + `parseSlash` in `src/lib/chilla.ts` + `runSlash` in `WorkspaceProvider` |

**Clearing demo state:** use Settings → Reset demo data. Bump `PREFIX` in `src/lib/storage.ts` if you change a stored data shape.

## How it's deployed with the landing page

The demo lives in the `demo/` folder of the landing page repo (originally built by Sifat in `sifatsayal/chilla-demo`; that history is kept). It has no backend, so it's built as a **static export** (`output: "export"` in `next.config.ts`) and served by the **same Vercel project** as the landing page:

- The repo root's `npm run build` (Vercel's build command, set in the root `vercel.json`) builds this app and copies `demo/out/` to `public/demo/`.
- `basePath: "/demo"` makes every page and asset live under `/demo`, so it's served at `chilla-azure.vercel.app/demo`.
- `public/demo/` is generated on every deploy and is gitignored.

Static export rules out a few Next.js features (server redirects/rewrites, route handlers, `cacheComponents`). Dynamic routes need `generateStaticParams`, which `c/[slug]` and `dm/[id]` already have.

## Working together on GitHub

- `main` is protected by convention. **Never push to it directly.**
- Create a branch per change: `git checkout -b feature/<short-name>` (or `fix/…`, `style/…`).
- Open a pull request. The template asks for a short description and screenshots.
- Get at least one teammate's review, make sure `npm run lint` and `npm run build` pass, then merge.
- On GitHub, turn on *Settings → Branches → Branch protection* for `main` (require a PR + 1 approval) to enforce this.
- Connect the repo to Vercel to get a preview URL on every PR.
