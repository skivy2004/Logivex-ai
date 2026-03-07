-- Run this in Supabase SQL Editor (Dashboard > SQL Editor) to create required tables.
--
-- To make a user an admin after signup, run:
--   update public.users set role = 'admin' where email = 'your@email.com';

-- Users profile (id matches auth.users.id)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Feature status for homepage demo cards (admin-editable)
create table if not exists public.features (
  id text primary key,
  name text not null,
  status text not null default 'online' check (status in ('beta', 'online', 'coming_soon')),
  updated_at timestamptz not null default now()
);

-- CRM demo leads for serverless-safe recent lead history
create table if not exists public.crm_leads (
  id text primary key,
  name text,
  company text,
  email text,
  phone text,
  industry text,
  location text,
  lead_intent text,
  lead_priority text,
  lead_classification text not null default 'Cold',
  source text,
  created_at timestamptz not null default now()
);

-- RLS: only service role can manage users and features from the backend.
alter table public.users enable row level security;
alter table public.features enable row level security;
alter table public.crm_leads enable row level security;

-- Allow service role full access (your Express app uses SUPABASE_SERVICE_ROLE_KEY).
create policy "Service role can do anything on users"
  on public.users for all
  using (true)
  with check (true);

create policy "Service role can do anything on features"
  on public.features for all
  using (true)
  with check (true);

create policy "Service role can do anything on crm_leads"
  on public.crm_leads for all
  using (true)
  with check (true);

-- Optional: allow authenticated users to read their own profile (for client-side).
create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

-- Trigger to set updated_at on users
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on public.users;
create trigger users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists features_updated_at on public.features;
create trigger features_updated_at
  before update on public.features
  for each row execute function public.set_updated_at();
