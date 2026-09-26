-- Align database feedback signals with the application-level Memory Fabric lifecycle.
-- Safe for fresh installs and upgrades because the constraint is replaced, not duplicated.
alter table memory_feedback drop constraint if exists memory_feedback_signal_check;
alter table memory_feedback add constraint memory_feedback_signal_check
  check (signal in (
    'confirm','contradict','useful','not_useful','reactivate',
    'supersede','review','invalidate','archive','dismiss'
  ));
