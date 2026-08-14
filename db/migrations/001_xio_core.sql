-- Apply from a trusted environment connected to Neon. Every user-owned table is keyed by user_id.
create extension if not exists pgcrypto;

create table users (
  id uuid primary key,
  email text not null unique,
  display_name text,
  plan text not null default 'core' check (plan in ('core','pro','business','executive')),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create table preferences (
  user_id uuid primary key references users(id) on delete cascade,
  learning_enabled boolean not null default true,
  ask_before_memory boolean not null default true,
  tone text not null default 'Calm & confident',
  detail_level text not null default 'Balanced',
  updated_at timestamptz not null default now()
);
create table memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  text text not null,
  category text not null,
  confidence smallint not null check (confidence between 5 and 100),
  source text not null,
  confirmed boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_confirmed_at timestamptz not null default now()
);
create index memories_user_active_idx on memories (user_id, active, created_at desc);
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  progress smallint not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active','paused','done')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  kind text not null,
  metadata jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
create table subscriptions (
  user_id uuid primary key references users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'inactive',
  price_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
-- Authorize through the application server: never expose DATABASE_URL to the browser.
