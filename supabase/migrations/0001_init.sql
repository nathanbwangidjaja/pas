-- pas schema. Bills are reached two ways: the organizer (a signed-in user or a guest
-- device) manages the whole bill; each friend gets a per-person pay link guarded by an
-- unguessable token. Bill tables have RLS on with no public policies, so only the server
-- (service role) touches them and we check the tokens ourselves. Profiles and saved
-- friends belong to a signed-in user and are guarded by ordinary owner RLS.

create extension if not exists pgcrypto;

-- a signed-in organizer's saved details
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  venmo_username text,
  zelle_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists saved_friends (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users on delete cascade,
  name text not null,
  venmo_username text,
  zelle_handle text,
  created_at timestamptz not null default now()
);
create index if not exists saved_friends_owner_idx on saved_friends (owner_user_id);

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  -- exactly one of these identifies the organizer
  owner_user_id uuid references auth.users on delete set null,
  owner_device text,
  title text not null default 'Receipt',
  status text not null default 'open' check (status in ('open', 'settled')),
  payer_name text,
  currency text not null default 'USD',
  subtotal_cents integer not null default 0,
  tax_cents integer not null default 0,
  tip_cents integer not null default 0,
  total_cents integer not null default 0,
  tip_mode text,                              -- e.g. "20%" or "custom", for display
  tax_tip_split text not null default 'proportional'
    check (tax_tip_split in ('proportional', 'even')),
  receipt_path text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists bills_owner_user_idx on bills (owner_user_id);
create index if not exists bills_owner_device_idx on bills (owner_device);

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills on delete cascade,
  name text not null,
  color_index integer not null default 0,
  sort integer not null default 0,
  is_payer boolean not null default false,
  venmo_username text,
  zelle_handle text,
  rail text check (rail in ('venmo', 'zelle')),
  paid boolean not null default false,
  paid_at timestamptz,
  pay_token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz not null default now()
);
create index if not exists participants_bill_idx on participants (bill_id);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills on delete cascade,
  name text not null,
  qty integer not null default 1,
  unit_price_cents integer not null default 0,
  line_total_cents integer not null default 0,
  low_confidence boolean not null default false,
  flag_reason text,
  sort integer not null default 0
);
create index if not exists items_bill_idx on items (bill_id);

create table if not exists item_assignees (
  item_id uuid not null references items on delete cascade,
  participant_id uuid not null references participants on delete cascade,
  weight integer not null default 1,
  primary key (item_id, participant_id)
);

-- updated_at bump for profiles
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on profiles;
create trigger profiles_updated_at before update on profiles
  for each row execute function set_updated_at();

-- Row level security ---------------------------------------------------------
alter table profiles enable row level security;
alter table saved_friends enable row level security;
alter table bills enable row level security;
alter table participants enable row level security;
alter table items enable row level security;
alter table item_assignees enable row level security;

-- a user can see and edit only their own profile
drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own saved friends" on saved_friends;
create policy "own saved friends" on saved_friends
  for all using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);

-- bills / participants / items / assignees: no policies on purpose. Nobody reaches them
-- with the anon or authenticated key; the server uses the service role and enforces
-- access with the owner check and the per-person pay tokens.

-- Private bucket for receipt photos. We hand out short-lived signed URLs from the server,
-- so no public read policy is needed.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Table privileges. This project was set up with "expose new tables" off (so nothing is
-- shared by default), which means we grant access by hand. The server uses service_role
-- for everything; a signed-in user only ever touches their own profile and saved friends,
-- and RLS above keeps them to their own rows. anon gets nothing — friends never query
-- directly, they go through the server.
grant all on table bills, participants, items, item_assignees, profiles, saved_friends to service_role;
grant all on table profiles, saved_friends to authenticated;
