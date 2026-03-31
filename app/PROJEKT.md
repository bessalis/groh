# Groh! – Projektöversikt

## Stack
- React PWA (Vite) → grooh.netlify.app
- Supabase (databas + auth)
- Repo: github.com/bessalis/groh
- Lokal dev: ~/groh/app → npm run dev → localhost:5173

## Sidor
- Home.jsx – startsida, illustration, senast tillagda
- SeedArchive.jsx – fröarkivet, swipe-to-archive
- SeedDetail.jsx – detaljvy, klickbara faser, arkivera/ta bort
- AddSeed.jsx – lägg till frö, AI-sök (CORS-blockad)
- Calendar.jsx – såkalender zon 4
- Profile.jsx – profil, logga ut
- Login.jsx – inloggning med brysselkål

## Databas (Supabase)
Tabell: seeds
Kolumner: id, user_id, name, species, notes, companion_planting,
frost_sensitive, requires_pretreatment, maintenance_level,
thumb, sown_date, sowing_type, current_phase, is_archived

## Bildnamnskonvention
{art}_{fas}.png – t.ex. luktart_growing.png
Faser: seed, seedling, growing, mature
Arter med bilder: aster, brysselkal, jungfruhirs, lavendel,
lejongap, luktart, riddarsporre, rosenskara, vallmo + fallback

## Todo
- Bilder uppdateras inte i listan efter fasbyte (kräver reload)
- AI-sökning blockeras av CORS (behöver Supabase Edge Function)
- Ikoner ska ses över (SVG 24x24 viewBox)
- Toggle-knappen sitter utanför appen i webbläsaren (ok på mobil)
