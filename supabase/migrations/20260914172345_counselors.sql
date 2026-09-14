alter table public.profiles
  add column email text,
  add column guardian_email text,
  add column push_token text;

alter table public.profiles
  add constraint guardian_email_distinct_from_email
  check (guardian_email is null or email is null or lower(guardian_email) <> lower(email));

create table public.counselors (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  bio text,
  photo_url text,
  timezone text,
  working_hours jsonb not null default '{}'::jsonb,
  allowed_durations integer[] not null default '{}',
  approved boolean not null default false,
  calendar_connected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.counselors
  add constraint allowed_durations_valid
  check (allowed_durations <@ array[30, 60, 90, 120]);

alter table public.counselors enable row level security;

create policy "Bookable counselors are visible to authenticated users"
  on public.counselors for select
  to authenticated
  using (approved = true and calendar_connected = true);

create policy "Counselors can view their own row"
  on public.counselors for select
  to authenticated
  using (auth.uid() = id);

create policy "Counselors can edit their own profile fields only"
  on public.counselors for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and approved = (select c.approved from public.counselors c where c.id = auth.uid())
    and calendar_connected = (select c.calendar_connected from public.counselors c where c.id = auth.uid())
  );

create table public.counselor_tokens (
  counselor_id uuid primary key references public.counselors (id) on delete cascade,
  refresh_token text not null
);

alter table public.counselor_tokens enable row level security;
-- Deliberately no policies at all: this table is service-role only,
-- never readable or writable by any client role, including the
-- counselor whose own token it stores.
