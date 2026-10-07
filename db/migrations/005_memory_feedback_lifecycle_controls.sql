-- Complete the Memory Fabric feedback vocabulary used by the application.
alter table memory_feedback drop constraint if exists memory_feedback_signal_check;
alter table memory_feedback add constraint memory_feedback_signal_check
  check (signal in ('confirm','contradict','useful','not_useful','reactivate','supersede','review','invalidate','archive','dismiss'));

create index if not exists memory_feedback_workspace_idx
  on memory_feedback(workspace_id, created_at desc);