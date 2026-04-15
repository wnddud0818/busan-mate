alter table public.itineraries
  add column if not exists planning_meta jsonb;
