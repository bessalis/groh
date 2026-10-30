-- Fas 1: gemensam växtdatamodell inför fotoskanning av fröpåsar.
--
-- Delat mellan alla (räknas ut en gång, bara serverfunktionerna skriver):
--   plant_facts      art      (finns, får svenskt namn och familj)
--   plant_varieties  sort     (ny, nyckel = artnyckel + sortnamn, också bildnyckel)
-- Användarens eget (Row Level Security per användare):
--   seeds            fröpåse  (finns, får sort, årgång, mängd, såmånader och foton)
--   seed_scans       en skanning, t.ex. ett batchläge med 8–10 påsar (ny)
--   seed_scan_items  en påse i skanningen: fram- och baksida, AI:ns läsning, rättningar (ny)
--   storage-bucket seed-packets för påsfotona, en mapp per användare
--
-- Inget befintligt tas bort eller flyttas. Sådd och fas ligger kvar på seeds tills fas 2.

-- ── Art ────────────────────────────────────────────────────────────────────
alter table public.plant_facts
  add column swedish_name text,
  add column family text;          -- t.ex. Fabaceae (ärtväxter)

-- ── Sort ───────────────────────────────────────────────────────────────────
create table public.plant_varieties (
  key text primary key,            -- '<artnyckel>|<sortnamn normaliserat>', t.ex. 'lathyrus odoratus|cupani'
  species_key text not null references public.plant_facts (key) on update cascade on delete cascade,
  cultivar text not null,          -- sortnamnet som det skrivs, t.ex. 'Cupani'
  swedish_name text,               -- t.ex. 'Luktärt'

  -- Sådata (kalendern i fas 2). Månader 1–12.
  sow_indoor_months smallint[],
  sow_outdoor_months smallint[],
  days_to_germination_min smallint,
  days_to_germination_max smallint,
  sowing_depth_cm numeric(4,1),
  light_germination boolean,       -- ljusgroende: täck inte fröet

  -- Utseende (drömträdgården i fas 4). Fylls på efter hand.
  height_cm_min smallint,
  height_cm_max smallint,
  spread_cm smallint,
  bloom_color text,
  bloom_months smallint[],

  status text not null default 'ai_draft' check (status in ('ai_draft', 'reviewed')),
  model text,
  needs_review boolean not null default false,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (species_key, cultivar),
  check (sow_indoor_months  <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  check (sow_outdoor_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  check (bloom_months       <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[])
);

create index plant_varieties_species_idx on public.plant_varieties (species_key);

create trigger plant_varieties_touch before update on public.plant_varieties
  for each row execute function public.touch_review_fields();

alter table public.plant_varieties enable row level security;
create policy "inloggade läser sorter" on public.plant_varieties
  for select to authenticated using (true);

-- ── Fröpåse ────────────────────────────────────────────────────────────────
alter table public.seeds
  add column variety_key text references public.plant_varieties (key) on update cascade on delete set null,
  add column cultivar text,                    -- sortnamnet som det står på påsen
  add column supplier text,                    -- t.ex. Impecta, Runåbergs, egen insamling
  add column packed_for_season smallint check (packed_for_season between 1900 and 2100),  -- årgång
  add column best_before date,
  add column amount text check (amount in ('full', 'half', 'little', 'empty')),
  -- Vad påsen själv säger om sådd. Det gäller för just den här påsen; sortens
  -- delade uppgifter fyller bara i det som saknas. Kolumnerna sowing_depth_cm,
  -- light_germination och days_to_germination_min/max finns redan på seeds och
  -- används för samma sak. Samma namn som i plant_varieties.
  add column sow_indoor_months smallint[] check (sow_indoor_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  add column sow_outdoor_months smallint[] check (sow_outdoor_months <@ array[1,2,3,4,5,6,7,8,9,10,11,12]::smallint[]),
  add column front_photo_path text,            -- sökväg i bucketen seed-packets
  add column back_photo_path text,
  add column source text not null default 'manual' check (source in ('manual', 'scan'));

create index seeds_user_idx on public.seeds (user_id);
create index seeds_variety_idx on public.seeds (variety_key);

-- ── Skanning ───────────────────────────────────────────────────────────────
create table public.seed_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  status text not null default 'capturing'
    check (status in ('capturing', 'reviewing', 'done', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.seed_scan_items (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.seed_scans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  position smallint not null,                  -- ordning i batchen, framsidornas ordning
  front_photo_path text,
  back_photo_path text,
  ai_status text not null default 'pending' check (ai_status in ('pending', 'read', 'failed')),
  ai_reading jsonb,                            -- AI:ns läsning, orörd
  model text,
  corrections jsonb not null default '{}'::jsonb,  -- det användaren ändrat, ovanpå läsningen
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'skipped')),
  seed_id uuid references public.seeds (id) on delete set null,  -- påsen som skapades vid bekräftelse
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scan_id, position)
);

create index seed_scans_user_idx on public.seed_scans (user_id, status);
create index seed_scan_items_scan_idx on public.seed_scan_items (scan_id);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger seed_scans_touch before update on public.seed_scans
  for each row execute function public.touch_updated_at();
create trigger seed_scan_items_touch before update on public.seed_scan_items
  for each row execute function public.touch_updated_at();

alter table public.seed_scans enable row level security;
alter table public.seed_scan_items enable row level security;

create policy "egna skanningar" on public.seed_scans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- En påse får bara läggas i en egen skanning.
create policy "egna skannade påsar" on public.seed_scan_items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and scan_id in (select id from public.seed_scans where user_id = auth.uid())
  );

-- ── Påsfoton ───────────────────────────────────────────────────────────────
-- Privat bucket. Varje användare har en egen mapp: <user_id>/<scan_id>/<position>-front.webp
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seed-packets', 'seed-packets', false, 2097152, array['image/webp', 'image/jpeg']);

create policy "läsa egna påsfoton" on storage.objects
  for select to authenticated
  using (bucket_id = 'seed-packets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ladda upp egna påsfoton" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'seed-packets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ändra egna påsfoton" on storage.objects
  for update to authenticated
  using (bucket_id = 'seed-packets' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ta bort egna påsfoton" on storage.objects
  for delete to authenticated
  using (bucket_id = 'seed-packets' and (storage.foldername(name))[1] = auth.uid()::text);
