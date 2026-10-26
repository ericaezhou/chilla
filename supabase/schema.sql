-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
create table if not exists public.signups (
  email        text primary key,
  plan         text,
  platform     text,
  role         text,
  company_size text,
  pain         text,
  source       text,
  referrer     text,
  step         text not null default 'hero',  -- 'hero' = email only, 'full' = full form
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Lock the table down: with RLS on and no policies, the public anon key can't read
-- or write it. Only our server (secret / service-role key) can, and it bypasses RLS.
alter table public.signups enable row level security;
revoke all on public.signups from anon, authenticated;
