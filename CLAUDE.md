# Groh! – instruktioner för Claude

Groh! är en svensk app för att hålla koll på fröer och odling: fröinventering, såkalender och (från 2027) Lilla akademin för växtkännedom. Produktägare och designer är Linnéa. Planen för 2027 finns i dokumentet "Groh! – backlog 2027" och uppgifterna på tavlan "Groh! uppgifter 2027".

Skriv till Linnéa på svenska. Kod, variabelnamn och commit-meddelanden får vara på engelska, men allt användaren ser är på svenska.

## Stack och struktur

- React 19 + Vite, PWA. All appkod ligger i `app/`.
- Supabase för databas och inloggning (`app/src/lib/supabase.js`).
- Netlify för hosting och serverfunktioner (`app/netlify/functions/`), live på grooh.netlify.app.
- AI-anrop går via Netlify-funktionerna mot Anthropics API, aldrig direkt från klienten. Nyckeln ligger i Netlifys miljövariabler (`ANTHROPIC_API_KEY`). Modellerna ställs in i `app/netlify/lib/models.js`.
- Frö-uppslag sparas per art i de delade tabellerna `plant_facts` och `plant_names`. Bara serverfunktionerna skriver dit, med `SUPABASE_SERVICE_ROLE_KEY` (hemlig, finns bara i Netlify). Fakta har status `ai_draft` eller `reviewed` och rättas i Table Editor.
- Odlingszonen (1–8, visas som I–VIII) sparas i användarens `user_metadata.zone` via `app/src/lib/zone.js`. Zon II antas tills användaren valt. Serverfunktionerna läser zonen från den verifierade användaren.
- Växtkategorier (åtta stycken, se `app/netlify/lib/categories.js`) sparas per art i `species_categories` och hämtas via `/api/categorize`. Ikonerna ligger som SVG-filer i `app/src/assets/icons/categories/` (tillfälligt Phosphor) och visas med `CategoryIcon`.
- Höstbokslut (`app/src/pages/Review.jsx`, `app/src/lib/review.js`): sparar hur årets sådder gick i `season_reviews` (egna rader per användare), nollställer sådden på fröet och flyttar det som blev inget till Komposten (arkiverade fröer, fliken i Fröarkivet). I fas 2 flyttas det till rätt modell med `plants`.
- Tak för AI-anrop: `useAiQuota` i `app/netlify/lib/db.js` räknar varje riktigt AI-anrop per användare och dag i `ai_usage` (standard 100, ändras med `AI_DAILY_LIMIT` i Netlify). Sparade svar räknas inte. Nya AI-funktioner ska anropa `useAiQuota` före anropet till Anthropic.
- Skanning av fröpåsar: `app/netlify/functions/scan-packet.js` läser fram- och baksidesfoto med `SCAN_MODEL` (räknas mot AI-taket) och sparar ingenting själv. Appen komprimerar fotot (`lib/photo.js`), laddar upp till `seed-packets`, sparar AI:ns läsning orörd och användarens rättningar (`lib/scan.js`) och skapar fröet först när användaren bekräftat (`pages/ScanPacket.jsx`).
- Batchskanning (`pages/BatchScan.jsx`): upp till 12 påsar. Framsidorna fotas först, sedan baksidan påse för påse (appen visar vilken påse), så ihopparningen är tydlig. Varje påse läses för sig med `scan-packet` (tre parallellt) och AI:n svarar `back_matches` om baksidan verkar höra till en annan påse; användaren kan byta baksida mellan två påsar. Fotona laddas upp före läsningen och påsen sparas även om läsningen misslyckas. Efter läsningen har skanningen status `reviewing` och kan fortsättas senare från Lägg till frö (`findOpenScan`, `loadScanItems`, `downloadPhoto`). Granskningsformuläret är gemensamt: `components/PacketForm.jsx` och `lib/scanForm.js`. Skanningssidorna laddas lat (`lazy`) så att startsidan förblir lätt.
- Kalendertips sparas på samma sätt: `season_tips` (säsongstext och allmänna tips per zon och månad) och `species_tips` (ett tips per art, zon, månad och fas).

Lokalt behövs `app/.env` med Supabase-adress och nyckel. Kopiera `app/.env.example` och fyll i värdena. I produktion ligger samma variabler i Netlify.

Kommandon (kör i `app/`):

```
npm install
npm run dev     # localhost:5173
npm run build
npm run lint
```

## Principer som gäller allt

1. **Öppenhet med AI.** Allt AI-genererat (uppslag, tips, faktakort, illustrationer) märks synligt i gränssnittet. Det AI:n har läst eller föreslagit ska användaren kunna granska och rätta innan det sparas.
2. **Räkna ut en gång och dela.** Uppslag och illustrationer sparas per sort och delas mellan användare. Säsongstips genereras per odlingszon och vecka, inte per användare. Gör inget AI-anrop om svaret redan finns sparat.
3. **Minsta modell som räcker** för uppgiften. Begränsa `max_tokens`.
4. **Lätt app.** Bilder i WebP och rätt storlek, komprimera foton vid uppladdning, fungera på äldre telefoner.
5. **Lugnt tempo.** Inga notiser per frö, utan samlade påminnelser. Ingen oändlig scroll.

## Databas

Projektet ligger i Supabase-regionen Stockholm (eu-north-1). Grundschemat finns i `supabase/migrations/20261028000000_initial_schema.sql`. Nya ändringar görs som migreringsfiler i `supabase/migrations/` med Supabase CLI, så att schemat finns i repot. Varje ny tabell ska ha Row Level Security påslaget och policyer som begränsar läsning och skrivning till rätt användare. Testa mot en separat utvecklingsdatabas, inte produktion.

### Växtdatamodellen (fas 1)

Se `supabase/migrations/20261030120000_plant_data_model.sql`.

- **Delat, per art:** `plant_facts` (latinskt namn, svenskt namn, familj) med kategorin i `species_categories`.
- **Delat, per sort:** `plant_varieties`, nyckel `'<artnyckel>|<sortnamn normaliserat>'`. Sådata (såmånader inne/ute, groningstid, sådjup, ljusgroning) och utseende (höjd, bredd, blomfärg, blomningsmånader). Nyckeln är också bildnyckel för illustrationen, med artens bild som reserv. Bara serverfunktionerna skriver.
- **Användarens fröpåse:** `seeds` med `variety_key`, `cultivar`, `supplier`, `packed_for_season` (årgång), `best_before`, `amount` (`full`, `half`, `little`, `empty`, ungefärligt med flit), påsens egna sådata i samma kolumnnamn som sorten, `front_photo_path`, `back_photo_path` och `source` (`manual`/`scan`).
- **Påsen gäller:** det som står på påsen går före sortens delade data, som bara fyller i det som saknas. Använd `sowingFor(seed, variety)` i `app/src/lib/packet.js`, som också säger var varje uppgift kommer ifrån (för AI-märkningen).
- **Skanning:** `seed_scans` (ett batchläge, status `capturing` → `reviewing` → `done`) och `seed_scan_items` (en påse: fram- och baksidesfoto, `ai_reading` orörd, användarens `corrections` ovanpå, `status` och `seed_id` när påsen bekräftats). Går att pausa och fortsätta.
- **Påsfoton:** privat bucket `seed-packets`, en mapp per användare (`<user_id>/<scan_id>/<position>-front.webp`). Båda sidorna sparas. Komprimera till WebP före uppladdning, högst 2 MB.

## Bilder

Fröillustrationerna är i Haeckels manér och genereras för hand av Linnéa i ett ChatGPT-projekt. Generera aldrig nya illustrationer själv.

- Idag ligger de i `app/src/assets/` som `{art}_{fas}.png` (faser: seed, seedling, growing, mature) med `fallback_growing.png` som reserv.
- Framåt: en enda planschbild per sort (frö, planta och blomma i samma bild), lagrad i Supabase Storage och kopplad via en bildnyckel (latinskt namn + sort, artens bild som reserv). Se avsnittet om fröbilder i backloggen.

## Design

Färger, typsnitt och radier finns som CSS-variabler i `app/src/styles/tokens.css`. Skriv aldrig hexkoder i komponenterna.

### Färger

- Använd **rolltokens** (`--bg`, `--surface`, `--surface-muted`, `--surface-raised`, `--border`/`--border-color`, `--text`, `--text-muted`, `--text-subtle`, `--text-accent`, `--accent`/`--on-accent`, `--accent-soft`, `--accent-selected`, `--accent-border`, `--accent-icon-bg`, `--danger`, `--danger-text`, `--warn-*`, `--info-*`, `--feature-*`). Råpaletten (`--salvia-*`, `--warm-*`) är bara byggstenar för rolltokens.
- Ljust/mörkt läge styrs av `data-theme` på `<html>` (sätts i App.jsx). Rolltokens byter värde själva, så sidor ska inte ta emot `dark` som prop eller ha egna `dark ? … : …`-färger.
- Kalendern sätter `data-season` och får `--season-accent` och `--season-secondary` plus egna ytor per årstid.
- Tillgänglighet styr: text ska klara WCAG AA (4,5:1, stor text 3:1) mot sin bakgrund i båda lägena. Sänk aldrig kontrasten med `opacity` på text. Nya färger kontrastkollas innan de läggs in.
- Ikoner (`Icon`, `CategoryIcon`) är SVG med `fill="currentColor"` och tar färg via `color`, gärna en token.

### Komponenter

Delade byggstenar i `app/src/components/ui.jsx` med stilar i `app/src/styles/components.css`. Använd dem i stället för egna inline-stilar.

- **Kort** är klasser: `card`, plus `card--compact`, `card--roomy`, `card--soft` (salvia), `card--muted` (utan kant) eller `card--feature` (salviakortet på startsidan). Ett klickbart kort är en `<button className="card">`, inte en `div` med `onClick`.
- **`Button`** med `variant`: `primary` (högst en per vy), `secondary` (standard), `ghost`, `danger`, `danger-ghost`, `link`, `feature`, `on-image`. `full` fyller bredden, `large` för huvudknappen. Minst 44px hög och med synlig fokusmarkering.
- **`SectionLabel`** för små versalrubriker ("Tillväxtfas"). Skriv texten med vanlig versal/gemen, CSS gör versalerna. Den är en `h2` (eller `as="h3"` inuti en sektion som redan har en rubrik).
- **Åtgärdsplattor** (`action-tile`, med `action-tile__icon`) är de salviagröna snabbknapparna på startsidan. `action-tile--wide` med `action-tile__text` och `action-tile__sub` ger en bred variant med ikonen till vänster, som "Fotografera fröpåsen".
- **Formulärfält** är klasser: `field` (omslag), `field-label`, `field-input`, `field-hint`, och `field-check` + `field-input--check` för "Kontrollera" när AI:n var osäker.
- **Valbara chips** är `<button className="chip">` i en `chips`-behållare, med `aria-pressed` (flerval) eller `role="radio"` + `aria-checked` (ett val).
- **`AiNote`** för all AI-märkning, med `status` `ai_draft` eller `reviewed` (se `lib/aiStatus.js` när flera texter visas samtidigt). `box` ger en salviaruta, `children` ersätter standardtexten.

### Typografi

Allt finns i `app/src/styles/typography.css`. Tre fria typsnitt (OFL), inbyggda i appen:

- **Reclame** (`--font-display`, klasser `t-display-s/m/l/xl`): sidrubriker, fröns namn och månaden. Aldrig under 22px.
- **Fraunces**, mjuk (`--font-heading`, `t-heading-s/heading/heading-l`, `t-prose`, `t-latin`): underrubriker (vikt 500), stämningstext (400) och latinska namn i kursiv.
- **Atkinson Hyperlegible Next** (`--font-body`, `t-body`, `t-small`, `t-caption`, `t-label`): all övrig text, knappar och fält.

Skriv aldrig typsnittsnamn eller egna storlekar direkt i koden, använd tokens eller klasserna. Lägg inte till typsnitt utan att kolla licensen: de ska vara fria för kommersiellt bruk och för inbäddning i webb och app.

## Mobil

- Sidans bakgrund (`--bg` på `<html>`) och `theme-color` följer ljust/mörkt läge via `data-theme` från App.jsx, så att ytan runt appen har samma färg.
- Fält har minst 16px text på pekskärmar, annars zoomar iPhone in och fastnar.
- Fasta element (menyn, knappar i botten) använder `env(safe-area-inset-*)` och får inte ha fast bredd större än skärmen.

## Arbetssätt

- En uppgift per gren. Små steg som går att testa i en deploy preview på telefonen.
- Fråga innan du ändrar databasschemat, tar bort data eller byter AI-modell.
- Berätta kort vad du ändrat och hur Linnéa testar det.

## Kända brister

- Bilder uppdateras inte i listan efter fasbyte förrän sidan laddas om.
