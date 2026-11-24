begin;

create table public.wwo_2025_spooky_game_stats (
  id bigint generated always as identity primary key,
  money integer not null,
  properties_owned integer not null check (properties_owned >= 0),
  total_revenue integer not null,
  total_property_value integer not null check (total_property_value >= 0),
  achievements text[] not null,
  player_title text not null,
  player_group text default 'humans' check (player_group in ('humans', 'elves', 'vampires')),
  timestamp timestamptz not null
);

alter table public.wwo_2025_spooky_game_stats enable row level security;

revoke all on table public.wwo_2025_spooky_game_stats from public, anon, authenticated;

grant select (money, properties_owned, total_property_value, achievements, player_title, player_group),
      insert (money, properties_owned, total_revenue, total_property_value, achievements, player_title, player_group, timestamp)
  on table public.wwo_2025_spooky_game_stats to anon;

create policy "Read game results"
  on public.wwo_2025_spooky_game_stats for select to anon using (true);

create policy "Submit game results"
  on public.wwo_2025_spooky_game_stats for insert to anon with check (true);

commit;
