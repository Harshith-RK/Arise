-- ============================================================================
-- Arise: per-Hunter storage.
--
-- One row per thing the Repository already saves, keyed the way the engine
-- already keys it (date, version). The payload stays JSONB and matching the
-- zod schemas in src/lib/engine/types.ts, so the engine needs no changes and
-- a plan shape can evolve without a migration.
--
-- Every table is owned by exactly one user and readable by nobody else.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------- singletons

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.supplies (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- collections

create table if not exists public.day_logs (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.weigh_ins (
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create table if not exists public.workout_plans (
  user_id    uuid not null references auth.users(id) on delete cascade,
  version    integer not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, version)
);

create table if not exists public.diet_plans (
  user_id    uuid not null references auth.users(id) on delete cascade,
  version    integer not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, version)
);

-- Reading a Hunter's own log range is the hot path.
create index if not exists day_logs_user_date_idx  on public.day_logs  (user_id, date desc);
create index if not exists weigh_ins_user_date_idx on public.weigh_ins (user_id, date desc);

-- ---------------------------------------------------------------- updated_at

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','settings','supplies','day_logs','weigh_ins','workout_plans','diet_plans']
  loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format(
      'create trigger touch_%1$s before update on public.%1$s
       for each row execute function public.touch_updated_at()', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- row security
--
-- A Hunter sees their own rows and nothing else. Written as one policy per
-- command so an accidental broad policy cannot widen read access.

do $$
declare t text;
begin
  foreach t in array array['profiles','settings','supplies','day_logs','weigh_ins','workout_plans','diet_plans']
  loop
    execute format('alter table public.%1$s enable row level security', t);
    execute format('alter table public.%1$s force row level security', t);

    execute format('drop policy if exists "%1$s_select_own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_insert_own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_update_own" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_delete_own" on public.%1$s', t);

    execute format(
      'create policy "%1$s_select_own" on public.%1$s
       for select to authenticated using (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s_insert_own" on public.%1$s
       for insert to authenticated with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s_update_own" on public.%1$s
       for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
    execute format(
      'create policy "%1$s_delete_own" on public.%1$s
       for delete to authenticated using (auth.uid() = user_id)', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------- realtime
--
-- Every table publishes changes. The client subscribes filtered to its own
-- user_id, and RLS means a filter that was tampered with returns nothing.

alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.settings;
alter publication supabase_realtime add table public.supplies;
alter publication supabase_realtime add table public.day_logs;
alter publication supabase_realtime add table public.weigh_ins;
alter publication supabase_realtime add table public.workout_plans;
alter publication supabase_realtime add table public.diet_plans;

-- Realtime sends old-row identity on update and delete, needed to match rows
-- locally when a change arrives from another device.
alter table public.profiles      replica identity full;
alter table public.settings      replica identity full;
alter table public.supplies      replica identity full;
alter table public.day_logs      replica identity full;
alter table public.weigh_ins     replica identity full;
alter table public.workout_plans replica identity full;
alter table public.diet_plans    replica identity full;
