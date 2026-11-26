-- Fas 1: fröbilder. En planschbild per sort (frö, planta och blomma i samma bild),
-- i Haeckels manér, gjord av Linnéa i ChatGPT. Delas mellan alla användare.
--
-- Bildnyckeln är sortens nyckel i plant_varieties ('lathyrus odoratus|cupani').
-- Saknas sortens bild används artens ('lathyrus odoratus') som reserv.
--
-- Bara serverfunktionerna skriver (service role). Uppladdningen går via en
-- Netlify-funktion som normaliserar bilden (beskär, centrerar, WebP i två storlekar)
-- och kontrollerar att användaren är admin (app_metadata.role = 'admin').
-- Uppladdning = godkännande, så det finns ingen granskningsstatus.
--
-- Publikt ligger bara visningsstorlekarna, med svårgissade filnamn
-- ('<slumpkod>-480.webp', '<slumpkod>-1200.webp'). Originalet sparas i den
-- privata bucketen seed-image-originals så att bilden kan göras om senare.

create table public.seed_images (
  key text primary key,            -- sortens nyckel, eller artens nyckel för artens reservbild
  species_key text not null references public.plant_facts (key) on update cascade on delete cascade,
  small_path text not null,        -- i bucketen seed-images, för listor (ca 480 px)
  large_path text not null,        -- för fröets sida (ca 1200 px)
  original_path text,              -- i den privata bucketen seed-image-originals
  made_with text not null default 'chatgpt',  -- för AI-märkningen: bilden är AI-genererad
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (key = species_key or key like species_key || '|%')
);

create index seed_images_species_idx on public.seed_images (species_key);

create trigger seed_images_touch before update on public.seed_images
  for each row execute function public.touch_updated_at();

alter table public.seed_images enable row level security;
create policy "inloggade läser fröbilder" on public.seed_images
  for select to authenticated using (true);

-- ── Bilderna ───────────────────────────────────────────────────────────────
-- Publik bucket: bilderna är gemensamma och inte personliga, och en publik länk
-- kan cachas av webbläsaren och CDN:en, vilket gör appen lättare än tillfälliga länkar.
-- Ingen policy för att skriva: bara service role (serverfunktionen) laddar upp.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seed-images', 'seed-images', true, 1048576, array['image/webp']);

-- Originalen: privata, inga policyer alls, så bara service role kommer åt dem.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seed-image-originals', 'seed-image-originals', false, 15728640, array['image/png', 'image/jpeg', 'image/webp']);
