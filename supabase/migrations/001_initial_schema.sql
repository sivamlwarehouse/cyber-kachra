-- Cyber-Kachra civic waste tracker schema

create table if not exists public.dumps (
  id text primary key,
  lat double precision not null,
  lng double precision not null,
  address_text text not null,
  ward_id integer not null,
  constituency_id integer not null,
  status text not null check (status in ('active', 'pending_verification', 'resolved')),
  confidence_score integer not null default 50,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  photos jsonb not null default '[]'::jsonb
);

create table if not exists public.citizen_reports (
  id text primary key,
  dump_id text not null references public.dumps(id) on delete cascade,
  image_url text not null,
  citizen_text text not null default '',
  severity text not null default 'moderate',
  complaint_type text not null default 'public_place',
  waste_type text not null default 'mixed',
  device_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.verification_logs (
  id text primary key,
  dump_id text not null references public.dumps(id) on delete cascade,
  device_hash text not null,
  vote_type text not null check (vote_type in ('still_exists', 'cleaned')),
  created_at timestamptz not null default now()
);

create index if not exists idx_dumps_status on public.dumps(status);
create index if not exists idx_dumps_ward_id on public.dumps(ward_id);
create index if not exists idx_dumps_constituency_id on public.dumps(constituency_id);
create index if not exists idx_citizen_reports_dump_id on public.citizen_reports(dump_id);
create index if not exists idx_verification_logs_dump_id on public.verification_logs(dump_id);
create index if not exists idx_verification_logs_created_at on public.verification_logs(created_at);

alter table public.dumps enable row level security;
alter table public.citizen_reports enable row level security;
alter table public.verification_logs enable row level security;

create policy "Service role full access on dumps"
  on public.dumps for all
  using (true)
  with check (true);

create policy "Service role full access on citizen_reports"
  on public.citizen_reports for all
  using (true)
  with check (true);

create policy "Service role full access on verification_logs"
  on public.verification_logs for all
  using (true)
  with check (true);
