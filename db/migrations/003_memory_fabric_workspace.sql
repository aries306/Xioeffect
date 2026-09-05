-- Workspace-scoped persistence for the authenticated Memory Fabric.
-- Existing UUID users remain the internal owner key; Clerk identity is stored separately.
alter table users add column if not exists clerk_user_id text;
create unique index if not exists users_clerk_user_idx on users(clerk_user_id) where clerk_user_id is not null;
alter table users alter column email drop not null;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  name text not null default 'Personal Workspace',
  context jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists workspaces_owner_idx on workspaces(owner_user_id);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role text not null default 'owner' check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index if not exists workspace_members_user_idx on workspace_members(user_id, workspace_id);

-- Give pre-existing users a personal workspace before attaching memories to it.
insert into workspaces (owner_user_id)
select u.id from users u
where not exists (select 1 from workspaces w where w.owner_user_id = u.id);
insert into workspace_members (workspace_id, user_id, role)
select w.id, w.owner_user_id, 'owner'
from workspaces w
where not exists (
  select 1 from workspace_members wm
  where wm.workspace_id = w.id and wm.user_id = w.owner_user_id
);

alter table memories add column if not exists workspace_id uuid;
alter table memories add column if not exists provenance jsonb not null default '{}';
alter table memories add column if not exists scope jsonb not null default '{}';
alter table memories add column if not exists relevance smallint not null default 50 check (relevance between 0 and 100);
alter table memories add column if not exists lifecycle_state text not null default 'active' check (lifecycle_state in ('active','dormant','superseded','rejected'));
alter table memories add column if not exists updated_at timestamptz not null default now();
alter table memories add column if not exists last_retrieved_at timestamptz;
alter table memories add column if not exists supersedes_memory_id uuid references memories(id) on delete set null;
update memories m
set workspace_id = w.id
from workspaces w
where m.workspace_id is null and w.owner_user_id = m.user_id;
create index if not exists memories_workspace_lifecycle_idx on memories(workspace_id, lifecycle_state, relevance desc, confidence desc, updated_at desc);
create index if not exists memories_workspace_category_idx on memories(workspace_id, category, active);
alter table memories add constraint memories_workspace_fk foreign key (workspace_id) references workspaces(id) on delete cascade;

alter table conversations add column if not exists workspace_id uuid;
update conversations c
set workspace_id = w.id
from workspaces w
where c.workspace_id is null and w.owner_user_id = c.user_id;
create index if not exists conversations_workspace_idx on conversations(workspace_id, created_at desc);
alter table conversations add constraint conversations_workspace_fk foreign key (workspace_id) references workspaces(id) on delete cascade;

create table if not exists memory_events (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  event_type text not null check (event_type in ('created','retrieved','confirmed','rejected','reinforced','feedback','reactivated','superseded','edited')),
  confidence_before smallint,
  confidence_after smallint,
  relevance_before smallint,
  relevance_after smallint,
  lifecycle_before text,
  lifecycle_after text,
  source text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists memory_events_memory_idx on memory_events(memory_id, created_at desc);
create index if not exists memory_events_workspace_idx on memory_events(workspace_id, created_at desc);

create table if not exists recommendation_outcomes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete set null,
  recommendation text not null,
  outcome text not null check (outcome in ('accepted','rejected','partial','unknown')),
  feedback text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists recommendation_outcomes_workspace_idx on recommendation_outcomes(workspace_id, created_at desc);

create table if not exists memory_feedback (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references memories(id) on delete cascade,
  recommendation_outcome_id uuid references recommendation_outcomes(id) on delete set null,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  signal text not null check (signal in ('confirm','contradict','useful','not_useful','reactivate','supersede','dismiss')),
  note text,
  created_at timestamptz not null default now()
);
create index if not exists memory_feedback_memory_idx on memory_feedback(memory_id, created_at desc);

-- Server authorization remains mandatory. These indexes support scoped access and retrieval.
