-- Delad växtfakta: ett AI-uppslag per art som alla användare delar.
-- Fakta börjar som AI-utkast och kan granskas och rättas i Table Editor.

create table public.plant_facts (
  -- Latinskt namn i gemener utan extra mellanslag, t.ex. 'lathyrus odoratus'
  key text primary key,
  -- Latinskt namn som det ska visas, t.ex. 'Lathyrus odoratus'
  species text not null,
  frost_sensitive boolean,
  requires_pretreatment boolean,
  pretreatment_note text,
  maintenance_level text check (maintenance_level in ('low', 'medium', 'high')),
  companion_planting text,
  sowing_note text,
  -- ai_draft = skrivet av AI, ogranskat. reviewed = granskat av en människa.
  status text not null default 'ai_draft' check (status in ('ai_draft', 'reviewed')),
  -- Modellen som skrev utkastet
  model text,
  -- Sätt till true när något verkar fel och raden behöver granskas
  needs_review boolean not null default false,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Det användare skriver ("luktärt", "Luktärter") kopplat till en art.
create table public.plant_names (
  -- Namnet i gemener utan extra mellanslag
  name text primary key,
  key text not null references public.plant_facts (key) on update cascade on delete cascade,
  created_at timestamptz not null default now()
);

create index plant_names_key_idx on public.plant_names (key);

-- Håll updated_at och reviewed_at aktuella när någon rättar i Table Editor.
create function public.plant_facts_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'reviewed' and old.status is distinct from 'reviewed' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

create trigger plant_facts_touch
  before update on public.plant_facts
  for each row execute function public.plant_facts_touch();

-- Row Level Security: inloggade användare får läsa, men bara serverfunktionerna
-- (med service role-nyckeln) och du i Supabase får skriva.
alter table public.plant_facts enable row level security;
alter table public.plant_names enable row level security;

create policy "inloggade läser växtfakta" on public.plant_facts
  for select to authenticated using (true);

create policy "inloggade läser växtnamn" on public.plant_names
  for select to authenticated using (true);
