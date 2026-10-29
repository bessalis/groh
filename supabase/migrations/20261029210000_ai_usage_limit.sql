-- Tak för AI-anrop: räknar anrop per användare och dag (svensk tid).
-- Bara serverfunktionerna (service role) kan läsa och räkna; användare kommer inte åt tabellen.

create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  calls integer not null default 0,
  primary key (user_id, day)
);

alter table public.ai_usage enable row level security;
-- Inga policyer: inloggade användare kan varken läsa eller ändra.

-- Räknar upp ett anrop och svarar om det ryms inom dagens tak.
create function public.use_ai_quota(p_user_id uuid, p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  insert into public.ai_usage (user_id, day, calls)
  values (p_user_id, (now() at time zone 'Europe/Stockholm')::date, 1)
  on conflict (user_id, day) do update set calls = public.ai_usage.calls + 1
  returning calls into n;
  return n <= p_limit;
end;
$$;

revoke execute on function public.use_ai_quota(uuid, integer) from public, anon, authenticated;
grant execute on function public.use_ai_quota(uuid, integer) to service_role;
