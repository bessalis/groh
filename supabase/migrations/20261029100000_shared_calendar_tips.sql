-- Delade kalendertips: skrivs en gång per zon och månad och delas av alla.
-- Precis som växtfaktan börjar de som AI-utkast och kan granskas i Table Editor.

-- Gemensam trigger: håller updated_at och reviewed_at aktuella vid rättning.
create function public.touch_review_fields() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'reviewed' and old.status is distinct from 'reviewed' then
    new.reviewed_at := now();
  end if;
  return new;
end;
$$;

-- Säsongstext och allmänna tips för en månad i en odlingszon.
create table public.season_tips (
  zone integer not null check (zone between 1 and 8),
  month integer not null check (month between 1 and 12),
  season_text text not null,
  general_tips jsonb not null default '[]'::jsonb,
  status text not null default 'ai_draft' check (status in ('ai_draft', 'reviewed')),
  model text,
  needs_review boolean not null default false,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (zone, month)
);

-- Ett kort tips för en art en viss månad, beroende på vilken fas fröet är i.
create table public.species_tips (
  -- Samma nyckel som i plant_facts (latinskt namn i gemener), eller fröets
  -- namn i gemener om det latinska namnet saknas
  key text not null,
  zone integer not null check (zone between 1 and 8),
  month integer not null check (month between 1 and 12),
  phase text not null default 'none' check (phase in ('none', 'seed', 'seedling', 'growing', 'mature')),
  tip text not null,
  status text not null default 'ai_draft' check (status in ('ai_draft', 'reviewed')),
  model text,
  needs_review boolean not null default false,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (key, zone, month, phase)
);

create trigger season_tips_touch before update on public.season_tips
  for each row execute function public.touch_review_fields();
create trigger species_tips_touch before update on public.species_tips
  for each row execute function public.touch_review_fields();

-- Inloggade får läsa, bara serverfunktionerna (service role) och du får skriva.
alter table public.season_tips enable row level security;
alter table public.species_tips enable row level security;

create policy "inloggade läser säsongstips" on public.season_tips
  for select to authenticated using (true);
create policy "inloggade läser artips" on public.species_tips
  for select to authenticated using (true);
