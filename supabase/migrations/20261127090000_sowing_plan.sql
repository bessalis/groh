-- Fas 2: Årets sådd och tidslinje per frö.
--
-- En rad i plants = ett frö som ska sås (eller sättas) en viss säsong.
-- Planerade datum räknas ut i appen (app/src/lib/timeline.js) från mallen,
-- sådata och sista frostdatum, så de sparas inte. Det som sparas är det som
-- faktiskt hänt (done_date), egna flyttade datum (planned_date), anteckning och foto.
-- Sista frostdatum: zonens ungefärliga, eller användarens eget i
-- user_metadata.last_frost ('MM-DD'). Ingen tabell behövs för det.

-- ── plants: säsong och mall ────────────────────────────────────────────────
alter table public.plants
  add column season integer,
  add column template text check (template in ('indoor', 'direct', 'bulb'));

create index plants_user_season_idx on public.plants (user_id, season);

-- Användarens data ska försvinna med kontot och med fröet (radera konto).
alter table public.plants drop constraint if exists plants_user_id_fkey,
  add constraint plants_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
alter table public.plants drop constraint if exists plants_seed_id_fkey,
  add constraint plants_seed_id_fkey foreign key (seed_id) references public.seeds (id) on delete cascade;
alter table public.growth_logs drop constraint if exists growth_logs_plant_id_fkey,
  add constraint growth_logs_plant_id_fkey foreign key (plant_id) references public.plants (id) on delete cascade;
alter table public.harvests drop constraint if exists harvests_plant_id_fkey,
  add constraint harvests_plant_id_fkey foreign key (plant_id) references public.plants (id) on delete cascade;

-- ── plant_steps: det som hänt, per steg ────────────────────────────────────
create table public.plant_steps (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid not null references public.plants (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  step text not null check (step in ('sow', 'germinate', 'pot_up', 'harden_off', 'plant_out', 'thin', 'plant_bulb', 'sprout')),
  planned_date date,          -- bara om användaren flyttat det planerade datumet själv
  done_date date,             -- när steget faktiskt gjordes
  note text,
  photo_path text,            -- i bucketen seed-packets, användarens mapp (snabbloggen, senare)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plant_id, step)
);

create trigger plant_steps_touch before update on public.plant_steps
  for each row execute function public.touch_updated_at();

alter table public.plant_steps enable row level security;
create policy "egna steg" on public.plant_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
