create table if not exists github_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  github_user_id bigint not null,
  github_login text not null,
  token_ciphertext text not null,
  token_iv text not null,
  token_auth_tag text not null,
  scopes text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id),
  unique(github_user_id)
);

create table if not exists github_repositories (
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references github_connections(id) on delete cascade,
  github_repo_id bigint not null,
  full_name text not null,
  name text not null,
  is_private boolean not null,
  default_branch text not null,
  html_url text not null,
  description text,
  pushed_at timestamptz,
  updated_at timestamptz not null,
  last_synced_at timestamptz,
  last_synced_commit text,
  unique(connection_id, github_repo_id)
);
create index if not exists github_repositories_connection_idx on github_repositories(connection_id);

create table if not exists github_documents (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references github_repositories(id) on delete cascade,
  path text not null,
  blob_sha text not null,
  content text not null,
  content_hash text not null,
  size_bytes integer,
  indexed_at timestamptz not null default now(),
  unique(repository_id, path)
);
create index if not exists github_documents_repo_idx on github_documents(repository_id);

create table if not exists research_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  source_type text not null default 'github',
  source_id uuid,
  title text not null,
  summary text,
  content text not null,
  provenance jsonb not null default '{}',
  confidence smallint not null default 80 check (confidence between 5 and 100),
  status text not null default 'candidate' check (status in ('candidate','validated','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists research_records_user_idx on research_records(user_id, created_at desc);

create table if not exists nexus_ingest_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  research_id uuid references research_records(id) on delete cascade,
  event_type text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);
create index if not exists nexus_ingest_events_pending_idx on nexus_ingest_events(delivered_at, created_at);
