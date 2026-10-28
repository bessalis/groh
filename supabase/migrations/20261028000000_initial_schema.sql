-- Groh! – grundschema
-- Återskapat från det ursprungliga projektet (Frankfurt) inför flytten till Stockholm, oktober 2026.
-- Tabellerna skapas i den ordning de beror på varandra.

-- Odlingsplatser (kruka eller friland)
create table public.locations (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  name text not null,
  zone integer not null,
  type text not null check (type in ('container', 'ground')),
  created_at timestamptz default now(),
  primary key (id)
);

-- Fröer i användarens frölåda
create table public.seeds (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  species text,
  photo_url text,
  notes text,
  companion_planting text,
  planned_location_id uuid references public.locations (id),
  thumb text check (thumb in ('up', 'down')),
  thumb_note text,
  is_archived boolean default false,
  maintenance_level text check (maintenance_level in ('low', 'medium', 'high')),
  frost_sensitive boolean default false,
  requires_pretreatment boolean default false,
  pretreatment_notes text,
  sowing_depth_cm numeric,
  seeds_per_cell integer,
  light_germination boolean,
  days_to_germination_min integer,
  days_to_germination_max integer,
  created_at timestamptz default now(),
  sown_date date,
  sowing_type text default 'indoor' check (sowing_type in ('indoor', 'outdoor')),
  current_phase text check (current_phase in ('seed', 'seedling', 'growing', 'mature')),
  is_favorite boolean default false,
  primary key (id)
);

-- Enskilda plantor som vuxit från ett frö
create table public.plants (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  seed_id uuid references public.seeds (id),
  location_id uuid references public.locations (id),
  sown_date date,
  current_phase text default 'germination'
    check (current_phase in ('germination', 'seedling', 'flowering', 'harvest')),
  current_height_cm numeric,
  status text default 'active' check (status in ('active', 'harvested', 'failed')),
  created_at timestamptz default now(),
  primary key (id)
);

-- Tillväxtlogg per planta
create table public.growth_logs (
  id uuid not null default gen_random_uuid(),
  plant_id uuid not null references public.plants (id),
  logged_at timestamptz default now(),
  height_cm numeric,
  photo_url text,
  note text,
  primary key (id)
);

-- Skördar per planta
create table public.harvests (
  id uuid not null default gen_random_uuid(),
  plant_id uuid not null references public.plants (id),
  harvested_at date default current_date,
  notes text,
  saved_seeds boolean default false,
  primary key (id)
);

-- Row Level Security: var och en ser och ändrar bara sina egna rader
alter table public.locations   enable row level security;
alter table public.seeds       enable row level security;
alter table public.plants      enable row level security;
alter table public.growth_logs enable row level security;
alter table public.harvests    enable row level security;

create policy "egna locations" on public.locations
  for all using (auth.uid() = user_id);

create policy "egna seeds" on public.seeds
  for all using (auth.uid() = user_id);

create policy "egna plants" on public.plants
  for all using (auth.uid() = user_id);

create policy "egna growth_logs" on public.growth_logs
  for all using (plant_id in (select id from public.plants where user_id = auth.uid()));

create policy "egna harvests" on public.harvests
  for all using (plant_id in (select id from public.plants where user_id = auth.uid()));
