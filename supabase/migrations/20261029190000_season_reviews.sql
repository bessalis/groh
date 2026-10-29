-- Höstbokslut: en rad per frö och säsong med hur det gick.
-- Sparar historiken innan sådden nollställs, så att Groh nästa år kan påminna
-- om förra årets lärdomar ("förra året grodde inte amaranten").

create table public.season_reviews (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  seed_id uuid references public.seeds (id) on delete set null,
  season integer not null,                       -- t.ex. 2026
  seed_name text not null,                       -- kopia, ifall fröet tas bort
  species text,
  outcome text not null check (outcome in ('good', 'so_so', 'failed')),
  reasons text[] not null default '{}',          -- grodde_inte, fros, sniglar, torka, glomde, annat
  note text,
  grow_again boolean,
  saved_seeds boolean not null default false,
  sown_date date,
  phase_at_review text,
  created_at timestamptz not null default now(),
  unique (seed_id, season)
);

create index season_reviews_user_season_idx on public.season_reviews (user_id, season);

alter table public.season_reviews enable row level security;

create policy "egna bokslut" on public.season_reviews
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
