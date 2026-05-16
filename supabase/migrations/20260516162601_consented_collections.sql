-- ============================================================================
-- Consented collections — permanent platform feature.
--
-- Three tables, all keyed by `collection_slug` so collections themselves are
-- DATA. A collection exists because a row exists in `collections`. No enum,
-- no hardcoded slug in code. Creating a new collection = inserting a row
-- (via scripts/v2/create-collection.ts).
--
-- Spec:      docs/v2/TIER_3_FOUNDING_BETA_GATEWAY_SPEC.md
-- Discovery: docs/audit/GATEWAY_DISCOVERY.md §A (revised) + §H (revised)
--
-- Schema invariants:
--   - collections.slug is the only place a slug is declared as "known".
--   - collection_memberships.collection_slug FK → collections.slug
--       ON DELETE RESTRICT — collections with consent history cannot be
--       silently deleted; deactivate (active=false) instead.
--   - consent_tokens.collection_slug FK → collections.slug (same RESTRICT
--       reasoning — tokens reference live collections).
--   - Public-read RLS on `collections WHERE active=true` so the dashboard
--       per-collection card loop + the public /collections/<slug> page can
--       render; inactive collections are not publicly readable (consistent
--       with /collections/<inactive-slug> → 404).
--   - Memberships + tokens are service-role-only (no public policies →
--       no anon/authenticated access; service role bypasses RLS).
-- ============================================================================

-- 1. collections — rows define what collections exist.
create table public.collections (
  slug         text     primary key,
  title        text     not null,
  description  text,
  created_at   timestamptz not null default now(),
  active       boolean  not null default true
);

-- 2. collection_memberships — per-builder consent per collection.
create table public.collection_memberships (
  id              bigserial primary key,
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null references public.collections(slug) on delete restrict,
  opted_in_at     timestamptz not null default now(),
  opted_out_at    timestamptz,
  source          text     not null check (source in ('dashboard','link')),
  source_metadata jsonb    not null default '{}'::jsonb
);

create index idx_collection_memberships_active
  on public.collection_memberships(collection_slug)
  where opted_out_at is null;

create index idx_collection_memberships_profile
  on public.collection_memberships(profile_id);

-- 3. consent_tokens — single-purpose opt-in tokens.
create table public.consent_tokens (
  token           text     primary key,                  -- 256-bit random, base64url
  profile_id      uuid     not null references public.profiles(id),
  collection_slug text     not null references public.collections(slug) on delete restrict,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  used_at         timestamptz,                            -- null until redeemed
  revoked_at      timestamptz                             -- null until manually invalidated
);

create index idx_consent_tokens_profile
  on public.consent_tokens(profile_id)
  where used_at is null and revoked_at is null;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.collections             enable row level security;
alter table public.collection_memberships  enable row level security;
alter table public.consent_tokens          enable row level security;

-- Public can read ACTIVE collections only (inactive → invisible → /collections/<slug> 404).
create policy "collections public read active"
  on public.collections for select
  to anon, authenticated
  using (active = true);

-- Memberships + tokens: no public policies → no anon/authenticated access.
-- Service role bypasses RLS, so server-only writes and reads need no policy.
