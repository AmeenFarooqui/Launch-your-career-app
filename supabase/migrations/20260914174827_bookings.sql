create extension if not exists btree_gist;

-- student_id references profiles, not auth.users directly, even though
-- profiles.id already equals auth.users.id 1:1 (enforced by the trigger
-- in the base backend plan) — PostgREST can only auto-join bookings to
-- profiles (e.g. to show a student's name) if a real FK connects them.
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  counselor_id uuid not null references public.counselors (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  meet_link text,
  google_event_id text not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint no_overlapping_bookings
    exclude using gist (
      counselor_id with =,
      tstzrange(start_time, end_time, '[)') with &&
    ) where (status = 'confirmed')
);

alter table public.bookings enable row level security;

create policy "Students and counselors can see their own bookings"
  on public.bookings for select
  to authenticated
  using (auth.uid() = student_id or auth.uid() = counselor_id);

-- No insert/update/delete policies here — every write goes through the
-- Edge Functions in this plan, using the service role.

create table public.reviews (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.reviews enable row level security;

create policy "Reviews are visible to authenticated users"
  on public.reviews for select
  to authenticated
  using (true);

create policy "A student can review their own completed booking once"
  on public.reviews for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bookings
      where bookings.id = booking_id
        and bookings.student_id = auth.uid()
        and bookings.status = 'confirmed'
        and bookings.end_time < now()
    )
  );
