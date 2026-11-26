-- Fas 2: odlingskärl och sådagar.
--
-- Ett kärl (containers) är en kruka, ett brätte med ett antal platser eller
-- friland/pallkrage. Kärlen finns kvar mellan åren; archived_at sätts när
-- användaren lägger undan ett kärl, så att historiken ligger kvar.
-- En sådd (sowings) är en gång användaren sått i ett kärl, ett datum.
-- Varje planta (plants, en per frö och säsong) vet vilken sådd den hör till och
-- vilka platser den har i kärlet. Platserna är bara nummer 1..slots; hur de
-- sitter i brättet bestämmer odlaren.

create table public.containers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  color text not null default 'white' check (color in ('yellow', 'white', 'wine', 'blue', 'green', 'black')),
  kind text not null check (kind in ('pot', 'tray', 'bed')),
  slots integer check (slots is null or slots between 1 and 200),   -- null för friland
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index containers_user_idx on public.containers (user_id);
create trigger containers_touch before update on public.containers
  for each row execute function public.touch_updated_at();

alter table public.containers enable row level security;
create policy "egna kärl" on public.containers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.sowings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  container_id uuid not null references public.containers (id) on delete cascade,
  sown_date date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sowings_user_idx on public.sowings (user_id, sown_date);
create index sowings_container_idx on public.sowings (container_id);
create trigger sowings_touch before update on public.sowings
  for each row execute function public.touch_updated_at();

alter table public.sowings enable row level security;
create policy "egna sådder" on public.sowings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.plants
  add column sowing_id uuid references public.sowings (id) on delete set null,
  add column slots integer[];

create index plants_sowing_idx on public.plants (sowing_id);
