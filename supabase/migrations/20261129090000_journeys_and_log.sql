-- Gro-resor och snabbloggen (fas 2).
--
-- En gro-resa är samma frö sått samma dag, också i olika kärl. Den räknas
-- fram i appen (app/src/lib/journeys.js) ur plants och plant_steps, så den
-- behöver ingen egen tabell. Det som ändras här:
--   1. Steget mature (blommar eller skördas), så att OG-fasen Mogen kan
--      räknas fram ur stegen som de andra faserna.
--   2. Snabbloggen i growth_logs: vem som skrev, förhållanden och foto.
--      Fotona ligger i den privata bucketen seed-packets, i användarens mapp
--      (<user_id>/logs/...), så de raderas med kontot som påsfotona.

-- ── 1. Steget mature ───────────────────────────────────────────────────────
alter table public.plant_steps drop constraint if exists plant_steps_step_check;
alter table public.plant_steps add constraint plant_steps_step_check
  check (step in ('sow', 'germinate', 'pot_up', 'harden_off', 'plant_out', 'thin', 'plant_bulb', 'sprout', 'mature'));

-- ── 2. Snabbloggen ─────────────────────────────────────────────────────────
alter table public.growth_logs
  add column user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  add column conditions text[] not null default '{}'
    check (conditions <@ array['cold', 'warm', 'dry', 'wet', 'low_light', 'poor_germination', 'pests']::text[]),
  add column photo_path text;      -- i bucketen seed-packets: <user_id>/logs/<plant_id>/<id>.webp

-- Tabellen är tom, men om det finns rader får de ägare via plantan.
update public.growth_logs g set user_id = p.user_id from public.plants p where p.id = g.plant_id and g.user_id is null;
alter table public.growth_logs alter column user_id set not null;
alter table public.growth_logs alter column logged_at set not null;

create index if not exists growth_logs_plant_idx on public.growth_logs (plant_id, logged_at desc);

drop policy if exists "egna growth_logs" on public.growth_logs;
create policy "egna growth_logs" on public.growth_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id and plant_id in (select id from public.plants where user_id = auth.uid()));
