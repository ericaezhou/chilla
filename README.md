# chilla

Landing page for **Chilla**, the PM's sidekick in Slack & Microsoft Teams. *Find the person who knows.*

This is a one-week pricing experiment: we post the page in PM communities (Reddit, Lenny's Newsletter Slack) and count how many PMs sign up for a paid pilot ($15/mo Standard, $29/mo Premium, or Free). Nobody is charged on sign-up.

## Project layout

```
demo/                interactive demo (Next.js), served at /demo. See demo/README.md
public/              static site served by Vercel
  index.html         the page (mascot SVG is defined once at the top as <symbol id="chilla">)
  styles.css         styles; brand palette is the CSS variables at the top
  script.js          form handling + utm_source tracking
  favicon.svg
api/subscribe.js     POST /api/subscribe: validates a sign-up and saves it to Supabase
lib/supabase.js      tiny Supabase REST client (no dependencies, server-side only)
supabase/schema.sql  creates the signups table (run once)
vercel.json          serves public/ as the site
```

The landing page itself has no build step. Vercel's build (`npm run build`) only builds the demo and copies it to `public/demo/`.

## Run locally

```bash
npm run build                 # builds the demo into public/demo (first run installs its packages)
npx serve public -l 4173      # open http://localhost:4173 and http://localhost:4173/demo
```

This previews the pages only. The sign-up API runs on Vercel. To work on the demo with live reload, run `npm install && npm run dev` inside `demo/`.

## Deploy (Vercel + Supabase)

1. Import this GitHub repo at <https://vercel.com/new>. Framework preset: **Other**. Leave the build settings empty (`vercel.json` sets them). Deploy.
2. Vercel project → **Storage** → **Supabase** (free plan) → create and connect it to the project.
   This sets `NEXT_PUBLIC_SUPABASE_URL` and the secret key env vars automatically. Leave "Custom Prefix" empty.
3. Open the new project in the Supabase dashboard → **SQL Editor** → paste [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
4. Vercel → **Deployments** → latest → **⋯ → Redeploy** so the env vars take effect.
5. Optional: Vercel project → **Analytics** → Enable, to get visitor counts for conversion rate.

## Environment variables

| Name | Purpose |
| --- | --- |
| `SUPABASE_URL` *or* `NEXT_PUBLIC_SUPABASE_URL` | Your project URL, e.g. `https://abcd.supabase.co` |
| `SUPABASE_SECRET_KEY` *or* `SUPABASE_SERVICE_ROLE_KEY` | Server-only key that can write to the table |

The Vercel Supabase integration sets these for you. If you created the Supabase project yourself, copy them from Supabase → **Project Settings → API Keys** into Vercel → **Settings → Environment Variables**.

Never commit these, and never put the secret key in `public/`. `.env*` files are gitignored.

## Viewing the sign-ups

Supabase dashboard → **Table Editor** → `signups`. You can sort, filter, and **Export → CSV** from there.

Columns: `email, plan, platform, role, company_size, pain, source, referrer, step, created_at, updated_at`.
`step` is `hero` when only the email was submitted from the top of the page and `full` when the full form was submitted.

Handy queries (SQL Editor):

```sql
select plan, count(*) from signups group by plan;
select coalesce(nullif(source, ''), '(direct)') as source, count(*) from signups group by 1;
```

Exports contain personal emails. Don't commit them (`*.csv` is gitignored).

Free Supabase projects pause after 7 days with no activity. Data is kept, and you can un-pause from the dashboard.

## Tracking where sign-ups come from

Add a `utm_source` to every link you post, for example:

- `https://<your-domain>/?utm_source=reddit`
- `https://<your-domain>/?utm_source=lenny`

The value shows up in the `source` column.
