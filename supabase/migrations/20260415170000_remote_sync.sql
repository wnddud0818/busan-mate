alter table public.itineraries
  add column if not exists client_id text;

update public.itineraries
set client_id = coalesce(client_id, id::text);

alter table public.itineraries
  alter column client_id set not null;

create unique index if not exists itineraries_client_id_key on public.itineraries(client_id);

alter table public.trip_sessions
  add column if not exists client_id text,
  add column if not exists current_day int not null default 1,
  add column if not exists current_stop_order int not null default 1;

update public.trip_sessions
set client_id = coalesce(client_id, id::text);

alter table public.trip_sessions
  alter column client_id set not null;

create unique index if not exists trip_sessions_client_id_key on public.trip_sessions(client_id);

alter table public.location_events
  add column if not exists client_id text;

update public.location_events
set client_id = coalesce(client_id, id::text);

alter table public.location_events
  alter column client_id set not null;

create unique index if not exists location_events_client_id_key on public.location_events(client_id);

alter table public.chat_threads
  add column if not exists client_id text,
  add column if not exists trip_session_id uuid references public.trip_sessions(id) on delete cascade;

update public.chat_threads
set client_id = coalesce(client_id, id::text);

alter table public.chat_threads
  alter column client_id set not null;

create unique index if not exists chat_threads_client_id_key on public.chat_threads(client_id);
create unique index if not exists chat_threads_trip_session_id_key on public.chat_threads(trip_session_id);

alter table public.chat_messages
  add column if not exists client_id text;

update public.chat_messages
set client_id = coalesce(client_id, id::text);

alter table public.chat_messages
  alter column client_id set not null;

create unique index if not exists chat_messages_client_id_key on public.chat_messages(client_id);

alter table public.ratings
  add column if not exists client_id text;

update public.ratings
set client_id = coalesce(client_id, id::text);

alter table public.ratings
  alter column client_id set not null;

create unique index if not exists ratings_client_id_key on public.ratings(client_id);

drop policy if exists "profiles_owner_insert" on public.profiles;
create policy "profiles_owner_insert" on public.profiles
  for insert with check (auth.uid() = auth_user_id);

drop policy if exists "profiles_owner_update" on public.profiles;
create policy "profiles_owner_update" on public.profiles
  for update using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);

drop policy if exists "itineraries_owner_update" on public.itineraries;
create policy "itineraries_owner_update" on public.itineraries
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "trip_sessions_owner_insert" on public.trip_sessions;
create policy "trip_sessions_owner_insert" on public.trip_sessions
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "trip_sessions_owner_update" on public.trip_sessions;
create policy "trip_sessions_owner_update" on public.trip_sessions
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "location_events_owner_select" on public.location_events;
create policy "location_events_owner_select" on public.location_events
  for select using (
    exists (
      select 1
      from public.trip_sessions s
      join public.profiles p on p.id = s.profile_id
      where s.id = trip_session_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "chat_threads_owner_select" on public.chat_threads;
create policy "chat_threads_owner_select" on public.chat_threads
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "chat_threads_owner_insert" on public.chat_threads;
create policy "chat_threads_owner_insert" on public.chat_threads
  for insert with check (
    exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_owner_select" on public.chat_messages;
create policy "chat_messages_owner_select" on public.chat_messages
  for select using (
    exists (
      select 1
      from public.chat_threads t
      join public.profiles p on p.id = t.profile_id
      where t.id = thread_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "chat_messages_owner_insert" on public.chat_messages;
create policy "chat_messages_owner_insert" on public.chat_messages
  for insert with check (
    exists (
      select 1
      from public.chat_threads t
      join public.profiles p on p.id = t.profile_id
      where t.id = thread_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "shared_itineraries_owner_insert" on public.shared_itineraries;
create policy "shared_itineraries_owner_insert" on public.shared_itineraries
  for insert with check (
    exists (
      select 1
      from public.itineraries i
      join public.profiles p on p.id = i.profile_id
      where i.id = itinerary_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "shared_itineraries_owner_update" on public.shared_itineraries;
create policy "shared_itineraries_owner_update" on public.shared_itineraries
  for update using (
    exists (
      select 1
      from public.itineraries i
      join public.profiles p on p.id = i.profile_id
      where i.id = itinerary_id and p.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.itineraries i
      join public.profiles p on p.id = i.profile_id
      where i.id = itinerary_id and p.auth_user_id = auth.uid()
    )
  );

drop policy if exists "ratings_owner_select" on public.ratings;
create policy "ratings_owner_select" on public.ratings
  for select using (auth.uid() is not null);
