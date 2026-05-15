-- ============================================================================
-- ShipStacked V2 Phase 1A — Step 1: proof_receipts schema v0.1
-- Spec: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §3.1, §3.2
-- Atlas foundation: v0.4 (live as of commit 3ce240e)
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- entities: humans, operators, fleets, agents
-- ────────────────────────────────────────────────────────────────────────────
create table entities (
  id              bigserial primary key,
  external_id     text unique not null,   -- shipstacked:entity:<ulid>
  kind            text not null check (kind in ('human','operator','fleet','agent')),
  display_name    text not null,
  slug            text unique not null,   -- /u/<slug>
  owner_user_id   uuid references auth.users(id), -- nullable for unclaimed entities
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_entities_slug on entities(slug);
create index idx_entities_owner on entities(owner_user_id) where owner_user_id is not null;

-- ────────────────────────────────────────────────────────────────────────────
-- atlas_roles: canonical role taxonomy, dereferenceable, versioned
-- ────────────────────────────────────────────────────────────────────────────
-- One row per (role_id, atlas_version). Receipts reference both.
-- v0.4 ships first (the current live Atlas). v0.3 rows also seeded
-- for historical receipts that may reference them.
-- Cluster G is ACTIVE in v0.4 (domain-practitioners G1-G6).
-- Cluster H+ reserved for future expansion (requires AtlasRoleId
-- regex update + schema_version bump).
create table atlas_roles (
  role_id         text not null,           -- "A1", "F3", "C2", "G1" (v0.4)
  atlas_version   text not null,           -- "v0.3", "v0.4"
  cluster         text not null,           -- "A".."G"
  name            text not null,
  short_description text not null,
  long_description_md text,                -- markdown for /atlas/roles/<id> page
  automation_trajectory text check (automation_trajectory in ('resistant','partial','collapsible')),

  -- v0.4 fields (populated where confident in v0.4; null where flagged as gap)
  isco_08_code        text,
  soc_2018_code       text,
  onet_code           text,
  crosswalk_status    text,                -- 'confident', 'partial', 'gap', 'combined'
  eu_ai_act_articles  text[],
  iso_42001_sections  text[],

  created_at      timestamptz not null default now(),
  primary key (role_id, atlas_version)
);

create index idx_atlas_roles_version on atlas_roles(atlas_version);
create index idx_atlas_roles_cluster on atlas_roles(atlas_version, cluster);

-- ────────────────────────────────────────────────────────────────────────────
-- proof_receipts: THE atomic primitive
-- ────────────────────────────────────────────────────────────────────────────
create table proof_receipts (
  id              bigserial primary key,
  external_id     text unique not null,    -- shipstacked:proof:<ulid>
  slug            text unique not null,    -- /p/<slug>

  schema_version  text not null default '0.1',
  atlas_version   text not null default 'v0.4',

  subject_id      bigint not null references entities(id),
  on_behalf_of_id bigint references entities(id),

  event_type      text not null,
  event_subtype   text,                    -- free text, harvested for v0.2

  title           text not null,
  description     text not null,
  occurred_at     timestamptz not null,
  occurred_at_precision text not null check (occurred_at_precision in ('day','month','quarter','year')),
  duration_seconds integer,

  -- artifacts, stack, outcomes stored as jsonb (validated by zod in app layer)
  artifacts       jsonb not null,          -- Artifact[]
  stack           jsonb not null default '[]'::jsonb,
  outcomes        jsonb not null default '[]'::jsonb,
  capabilities    text[] not null default '{}',

  -- Atlas classification — multi-source
  atlas_claimed   text[] not null default '{}',
  atlas_inferred  text[] not null default '{}',
  atlas_confirmed text[] not null default '{}',
  atlas_confidence numeric(3,2) not null default 0.0 check (atlas_confidence >= 0 and atlas_confidence <= 1),
  classifier_version text not null,
  classified_at   timestamptz not null,

  verification_level text not null default 'L1_artifact_confirmed',

  visibility      text not null default 'public' check (visibility in ('public','unlisted','private')),
  ingestion_source text not null,
  ingestion_metadata jsonb not null default '{}'::jsonb,

  issued_at       timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_receipts_subject on proof_receipts(subject_id);
create index idx_receipts_event_type on proof_receipts(event_type);
create index idx_receipts_visibility on proof_receipts(visibility) where visibility = 'public';
create index idx_receipts_atlas_confirmed on proof_receipts using gin(atlas_confirmed);
create index idx_receipts_capabilities on proof_receipts using gin(capabilities);
create index idx_receipts_issued_at on proof_receipts(issued_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- verification_events: APPEND-ONLY ladder log
-- ────────────────────────────────────────────────────────────────────────────
create table verification_events (
  id              bigserial primary key,
  receipt_id      bigint not null references proof_receipts(id) on delete cascade,
  level           text not null,
  achieved_at     timestamptz not null default now(),
  method          text not null,           -- "url_fetch", "github_api", "client_signature", "did_web"
  evidence        jsonb not null default '{}'::jsonb
);

create index idx_verification_receipt on verification_events(receipt_id);

-- This table is APPEND-ONLY by convention. Do not UPDATE or DELETE rows in app code.
-- The current verification_level on proof_receipts is denormalized for queries;
-- this log is the canonical history.

-- ────────────────────────────────────────────────────────────────────────────
-- attestations: L3+ third-party signatures
-- ────────────────────────────────────────────────────────────────────────────
create table attestations (
  id              bigserial primary key,
  receipt_id      bigint not null references proof_receipts(id) on delete cascade,
  attestor_id     bigint not null references entities(id),
  attestor_role   text not null check (attestor_role in ('client','employer','peer','platform')),
  statement       text not null,
  signed_at       timestamptz not null default now(),
  signature       text,                    -- L4 only
  signature_method text                    -- e.g. "did:web", "did:key"
);

create index idx_attestations_receipt on attestations(receipt_id);

-- ────────────────────────────────────────────────────────────────────────────
-- capabilities_vocab: harvested controlled vocabulary
-- ────────────────────────────────────────────────────────────────────────────
create table capabilities_vocab (
  tag             text primary key,
  first_seen_at   timestamptz not null default now(),
  receipt_count   integer not null default 0,
  promoted        boolean not null default false  -- canonical vs harvested
);

-- Populated by trigger or batch job from proof_receipts.capabilities[].
-- Used by /api/search and tag autocomplete.

-- ────────────────────────────────────────────────────────────────────────────
-- ingestion_log: provenance, debugging, channel analytics
-- ────────────────────────────────────────────────────────────────────────────
create table ingestion_log (
  id              bigserial primary key,
  receipt_id      bigint references proof_receipts(id) on delete set null,
  source          text not null,
  source_url      text,
  request_id      text,                    -- correlate with API logs
  status          text not null,           -- "classified", "analyzed", "published", "failed"
  error           text,
  created_at      timestamptz not null default now()
);

create index idx_ingestion_source on ingestion_log(source, created_at desc);

-- ============================================================================
-- Row Level Security — §3.2
-- ----------------------------------------------------------------------------
-- All tables in public schema get RLS enabled. Service role bypasses RLS, so
-- server-only writes need no explicit policy (the absence of INSERT/UPDATE
-- policies for anon/authenticated is what makes them server-only).
-- ============================================================================

alter table entities             enable row level security;
alter table atlas_roles          enable row level security;
alter table proof_receipts       enable row level security;
alter table verification_events  enable row level security;
alter table attestations         enable row level security;
alter table capabilities_vocab   enable row level security;
alter table ingestion_log        enable row level security;

-- entities: public read; write only by owner
create policy "entities public read"
  on entities for select
  to anon, authenticated
  using (true);

create policy "entities owner write"
  on entities for all
  to authenticated
  using (owner_user_id = (select auth.uid()))
  with check (owner_user_id = (select auth.uid()));

-- atlas_roles: public read; admin write only (service role bypasses RLS)
create policy "atlas_roles public read"
  on atlas_roles for select
  to anon, authenticated
  using (true);

-- proof_receipts: public read where visibility = 'public'; write only by subject owner
create policy "proof_receipts public read"
  on proof_receipts for select
  to anon, authenticated
  using (visibility = 'public');

create policy "proof_receipts owner select"
  on proof_receipts for select
  to authenticated
  using (
    subject_id in (
      select id from entities where owner_user_id = (select auth.uid())
    )
  );

create policy "proof_receipts owner insert"
  on proof_receipts for insert
  to authenticated
  with check (
    subject_id in (
      select id from entities where owner_user_id = (select auth.uid())
    )
  );

create policy "proof_receipts owner update"
  on proof_receipts for update
  to authenticated
  using (
    subject_id in (
      select id from entities where owner_user_id = (select auth.uid())
    )
  )
  with check (
    subject_id in (
      select id from entities where owner_user_id = (select auth.uid())
    )
  );

-- verification_events: public read (visible on /p/<slug> receipt page);
-- server-only writes via service role.
create policy "verification_events public read"
  on verification_events for select
  to anon, authenticated
  using (
    receipt_id in (
      select id from proof_receipts where visibility = 'public'
    )
  );

-- attestations: public read (visible on /p/<slug> receipt page);
-- server-only writes via service role.
create policy "attestations public read"
  on attestations for select
  to anon, authenticated
  using (
    receipt_id in (
      select id from proof_receipts where visibility = 'public'
    )
  );

-- capabilities_vocab: public read (used by search/autocomplete);
-- server-only writes via service role.
create policy "capabilities_vocab public read"
  on capabilities_vocab for select
  to anon, authenticated
  using (true);

-- ingestion_log: no public access. Service role only.
-- (No policies created → no anon/authenticated access. Service role bypasses RLS.)
