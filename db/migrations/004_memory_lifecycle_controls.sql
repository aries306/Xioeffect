-- Complete the Memory Fabric lifecycle while retaining legacy rejected records.
alter table memories drop constraint if exists memories_lifecycle_state_check;
alter table memories add constraint memories_lifecycle_state_check
  check (lifecycle_state in ('active','dormant','review','superseded','invalidated','archived','rejected'));

create index if not exists memories_workspace_state_idx
  on memories(workspace_id, lifecycle_state, updated_at desc);
