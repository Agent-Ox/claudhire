-- ============================================================================
-- Tier 1 merge — bidirectional link between V1 `profiles` and V2 `entities`.
-- Spec: docs/v2/TIER_1_MERGE_SPEC.md §4.2
-- Discovery: docs/audit/MERGE_DISCOVERY.md §H2 (Option C — explicit FK both
-- ways + slug-equals-username invariant enforced at write time).
--
-- Both columns are nullable. The backfill script populates them for the
-- approved cohort; unverified / new-user accounts get linked lazily by the
-- updated findOrCreateHumanEntity() resolver. Partial unique indexes enforce
-- one-to-one without blocking the many-null lazy-link state.
-- ============================================================================

alter table public.entities  add column profile_id uuid   references public.profiles(id);
alter table public.profiles  add column entity_id  bigint references public.entities(id);

create unique index idx_entities_profile_id
  on public.entities(profile_id)
  where profile_id is not null;

create unique index idx_profiles_entity_id
  on public.profiles(entity_id)
  where entity_id is not null;
