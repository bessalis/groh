-- Växtkategorier: en kategori per art, delad mellan alla användare.
-- Används för ikoner i kalendern och senare som filter i fröarkivet.
-- Kategorin utgår från hur växten odlas och används, inte från botaniken
-- (luktärt är en sommarblomma, inte en baljväxt).

create table public.species_categories (
  -- Samma nyckel som i plant_facts och species_tips (latinskt namn i gemener,
  -- eller fröets namn i gemener om det latinska saknas)
  key text primary key,
  category text not null check (category in (
    'fruit_veg',      -- fruktgrönsaker: tomat, gurka, squash, chili
    'root',           -- rotfrukter: morot, rödbeta, rädisa, potatis
    'onion',          -- lök: gul lök, purjo, vitlök
    'leafy',          -- blad och kål: sallat, spenat, grönkål, broccoli
    'legume',         -- baljväxter: ärter, bönor
    'herb',           -- kryddor och örter: basilika, persilja, dill
    'annual_flower',  -- sommarblommor: rosenskära, lejongap, luktärt
    'perennial'       -- perenner och lökväxter: lavendel, riddarsporre, påsklilja
  )),
  status text not null default 'ai_draft' check (status in ('ai_draft', 'reviewed')),
  model text,
  needs_review boolean not null default false,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger species_categories_touch before update on public.species_categories
  for each row execute function public.touch_review_fields();

alter table public.species_categories enable row level security;

create policy "inloggade läser kategorier" on public.species_categories
  for select to authenticated using (true);
