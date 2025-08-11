-- Create status type via CHECK (no time-based constraint)
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  driver_name text not null,
  companions text[] not null default '{}',
  car text not null,
  pickup_date date not null,
  return_date date not null,
  destinations text[] not null default '{}',
  status text not null default 'ativa',
  created_at timestamptz not null default now(),
  constraint reservations_status_check check (status in ('ativa','concluída','cancelada'))
);

-- Indexes for querying
create index if not exists idx_reservations_driver_name on public.reservations (driver_name);
create index if not exists idx_reservations_car on public.reservations (car);
create index if not exists idx_reservations_pickup_date on public.reservations (pickup_date);
create index if not exists idx_reservations_return_date on public.reservations (return_date);
create index if not exists idx_reservations_destinations on public.reservations using gin (destinations);

-- Enable RLS
alter table public.reservations enable row level security;

-- Policies: public can read and insert (no updates/deletes for now)
create policy if not exists "Reservations are viewable by everyone"
  on public.reservations for select
  using (true);

create policy if not exists "Anyone can insert reservations"
  on public.reservations for insert
  with check (true);

-- Trigger to auto-set status based on return_date at write-time
create or replace function public.set_reservation_status()
returns trigger as $$
begin
  if new.status = 'cancelada' then
    return new; -- honor explicit cancellation
  end if;

  if new.return_date < current_date then
    new.status := 'concluída';
  else
    new.status := coalesce(new.status, 'ativa');
  end if;
  return new;
end;
$$ language plpgsql;

create or replace trigger trg_set_reservation_status
before insert or update on public.reservations
for each row execute function public.set_reservation_status();