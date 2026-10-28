# Groh! – instruktioner för Claude

Groh! är en svensk app för att hålla koll på fröer och odling: fröinventering, såkalender och (från 2027) Lilla akademin för växtkännedom. Produktägare och designer är Linnéa. Planen för 2027 finns i dokumentet "Groh! – backlog 2027" och uppgifterna på tavlan "Groh! uppgifter 2027".

Skriv till Linnéa på svenska. Kod, variabelnamn och commit-meddelanden får vara på engelska, men allt användaren ser är på svenska.

## Stack och struktur

- React 19 + Vite, PWA. All appkod ligger i `app/`.
- Supabase för databas och inloggning (`app/src/lib/supabase.js`).
- Netlify för hosting och serverfunktioner (`app/netlify/functions/`), live på grooh.netlify.app.
- AI-anrop går via Netlify-funktionerna mot Anthropics API, aldrig direkt från klienten. Nyckeln ligger i Netlifys miljövariabler (`ANTHROPIC_API_KEY`).

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

## Bilder

Fröillustrationerna är i Haeckels manér och genereras för hand av Linnéa i ett ChatGPT-projekt. Generera aldrig nya illustrationer själv.

- Idag ligger de i `app/src/assets/` som `{art}_{fas}.png` (faser: seed, seedling, growing, mature) med `fallback_growing.png` som reserv.
- Framåt: en enda planschbild per sort (frö, planta och blomma i samma bild), lagrad i Supabase Storage och kopplad via en bildnyckel (latinskt namn + sort, artens bild som reserv). Se avsnittet om fröbilder i backloggen.

## Design

Färger, typsnitt och radier finns som CSS-variabler i `app/src/styles/tokens.css`. Använd dem i stället för hårdkodade färger. Mycket av den befintliga koden har inline-stilar med hårdkodade färger, så flytta över till tokens när du ändå arbetar i en fil, men gör inga stora omskrivningar utan att fråga.

## Arbetssätt

- En uppgift per gren. Små steg som går att testa i en deploy preview på telefonen.
- Fråga innan du ändrar databasschemat, tar bort data eller byter AI-modell.
- Berätta kort vad du ändrat och hur Linnéa testar det.

## Kända brister

- AI-funktionerna saknar inloggningskontroll och begränsning, så vem som helst som hittar adressen kan använda API-nyckeln.
- Användarens text klistras rakt in i promptarna i `ai-lookup.js`.
- Odlingszon 4 är hårdkodad i promptarna och kalendern.
- Bilder uppdateras inte i listan efter fasbyte förrän sidan laddas om.
