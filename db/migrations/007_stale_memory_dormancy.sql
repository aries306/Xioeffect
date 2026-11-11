-- Record automatic freshness demotions as first-class Memory Fabric lifecycle events.
alter table memory_events drop constraint if exists memory_events_event_type_check;
alter table memory_events add constraint memory_events_event_type_check
  check (event_type in ('created','retrieved','evaluated','confirmed','rejected','reinforced','feedback','reactivated','superseded','edited','dormant'));
