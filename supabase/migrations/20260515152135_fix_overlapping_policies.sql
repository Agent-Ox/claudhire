-- ============================================================================
-- Fix overlapping permissive policies flagged by Supabase performance advisor.
-- Both fixes split or narrow policies so anon/authenticated SELECTs evaluate
-- exactly one policy per row, instead of two.
-- ============================================================================

-- ── entities ────────────────────────────────────────────────────────────────
-- The original "entities owner write" was FOR ALL, which implicitly granted
-- SELECT to authenticated owners on top of the broader "entities public read"
-- policy. Split into explicit INSERT/UPDATE/DELETE so SELECT is owned solely
-- by the public-read policy.

drop policy "entities owner write" on entities;

create policy "entities owner insert"
  on entities for insert
  to authenticated
  with check (owner_user_id = (select auth.uid()));

create policy "entities owner update"
  on entities for update
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

create policy "entities owner delete"
  on entities for delete
  to authenticated
  using (owner_user_id = (select auth.uid()));

-- ── proof_receipts ──────────────────────────────────────────────────────────
-- The original "proof_receipts owner select" matched public receipts owned
-- by the caller in addition to non-public ones, double-evaluating with the
-- "public read" policy. Narrow it to visibility != 'public' so the two
-- policies are disjoint: public read covers public rows, owner select covers
-- the rest.

drop policy "proof_receipts owner select" on proof_receipts;

create policy "proof_receipts owner select"
  on proof_receipts for select
  to authenticated
  using (
    visibility <> 'public'
    and subject_id in (
      select id from entities where owner_user_id = (select auth.uid())
    )
  );
