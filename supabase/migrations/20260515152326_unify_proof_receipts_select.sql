-- ============================================================================
-- Unify the two SELECT policies on proof_receipts so each role has exactly one
-- SELECT policy. The previous migration narrowed the owner-select USING clause
-- to make the two policies' row sets disjoint at runtime, but the multiple-
-- permissive-policies advisor counts policy definitions per role/action, not
-- their runtime evaluation. Replace both with per-role single policies.
-- ============================================================================

drop policy "proof_receipts public read" on proof_receipts;
drop policy "proof_receipts owner select" on proof_receipts;

create policy "proof_receipts read anon"
  on proof_receipts for select
  to anon
  using (visibility = 'public');

create policy "proof_receipts read authenticated"
  on proof_receipts for select
  to authenticated
  using (
    visibility = 'public'
    or subject_id in (
      select id from entities where owner_user_id = (select auth.uid())
    )
  );
