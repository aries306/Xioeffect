-- Sanctum contextual evaluation and explicit memory relations.
-- Derived relationships never mutate a source memory silently.
alter table memory_events drop constraint if exists memory_events_event_type_check;
alter table memory_events add constraint memory_events_event_type_check
  check (event_type in ('created','retrieved','evaluated','confirmed','rejected','reinforced','feedback','reactivated','superseded','edited'));

create table if not exists memory_relations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  source_memory_id uuid not null references memories(id) on delete cascade,
  target_memory_id uuid not null references memories(id) on delete cascade,
  relation_type text not null check (relation_type in ('supports','contradicts','supersedes','related')),
  confidence smallint not null default 50 check (confidence between 0 and 100),
  provenance jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(source_memory_id, target_memory_id, relation_type)
);
create index if not exists memory_relations_source_idx on memory_relations(source_memory_id, relation_type);
create index if not exists memory_relations_target_idx on memory_relations(target_memory_id, relation_type);
create index if not exists memory_relations_workspace_idx on memory_relations(workspace_id, created_at desc);

alter table memories add column if not exists last_evaluated_at timestamptz;
alter table memories add column if not exists evaluation jsonb not null default '{}';
create index if not exists memories_last_evaluated_idx on memories(workspace_id, last_evaluated_at desc);
