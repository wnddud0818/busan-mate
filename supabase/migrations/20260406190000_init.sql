create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique,
  locale text not null default 'ko',
  is_anonymous boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.place_cache (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'seed',
  slug text not null unique,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.transit_cache (
  id uuid primary key default gen_random_uuid(),
  from_place_id text not null,
  to_place_id text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.itineraries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  locale text not null default 'ko',
  title jsonb not null,
  summary jsonb not null,
  preferences jsonb not null,
  source text not null default 'fallback',
  share_status text not null default 'private',
  rating_average numeric(3,1) not null default 4.5,
  estimated_budget_label jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.itinerary_days (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  day_number int not null,
  theme jsonb not null
);

create table if not exists public.itinerary_stops (
  id uuid primary key default gen_random_uuid(),
  itinerary_day_id uuid not null references public.itinerary_days(id) on delete cascade,
  stop_order int not null,
  place_id text not null,
  payload jsonb not null
);

create table if not exists public.trip_sessions (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active',
  location_consent boolean not null default false,
  started_at timestamptz not null default now(),
  last_alert_at timestamptz
);

create table if not exists public.location_events (
  id uuid primary key default gen_random_uuid(),
  trip_session_id uuid not null references public.trip_sessions(id) on delete cascade,
  geohash text,
  consented boolean not null default false,
  captured_at timestamptz not null default now()
);

create table if not exists public.chat_threads (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.chat_threads(id) on delete cascade,
  role text not null,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_itineraries (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null unique references public.itineraries(id) on delete cascade,
  hero_place_name jsonb not null,
  tags text[] not null default '{}',
  current_travelers int not null default 0,
  score numeric(6,1) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid not null references public.itineraries(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists public.ranking_snapshots (
  id uuid primary key default gen_random_uuid(),
  itinerary_id uuid references public.itineraries(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_links (
  id uuid primary key default gen_random_uuid(),
  place_id text not null,
  provider text not null,
  label jsonb not null,
  url text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.itineraries enable row level security;
alter table public.trip_sessions enable row level security;
alter table public.location_events enable row level security;
alter table public.chat_threads enable row level security;
alter table public.chat_messages enable row level security;
alter table public.shared_itineraries enable row level security;
alter table public.ratings enable row level security;
alter table public.ranking_snapshots enable row level security;

create policy "profiles_owner_select" on public.profiles
  for select using (auth.uid() = auth_user_id);

create policy "itineraries_owner_select" on public.itineraries
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

create policy "itineraries_owner_insert" on public.itineraries
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

create policy "shared_itineraries_public_select" on public.shared_itineraries
  for select using (true);

create policy "trip_sessions_owner_select" on public.trip_sessions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

create policy "location_events_owner_insert" on public.location_events
  for insert with check (true);

create policy "ratings_owner_insert" on public.ratings
  for insert with check (auth.uid() is not null);
