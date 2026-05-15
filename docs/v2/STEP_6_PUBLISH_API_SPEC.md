# ShipStacked V2 — Step 6: Publish API

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Steps 1–5 (DB, classify, analyze, atlas-classify, paste UI — all shipped)
**Output:** `POST /api/paste/publish` — turns a paste-flow draft into a committed proof receipt with a canonical URL.
**Status:** Ready to execute. No re-litigation of upstream design.

---

## 0. Where Step 6 sits in the pipeline

```
/paste ✓ → /paste/review ✓ → PUBLISH (Step 6) → /p/[slug] (Step 7)
                                    ↑
                                You are here
```

Step 5 left the Publish CTA disabled. Step 6 wires it. After Step 6, a logged-in user can paste a URL, review the draft, click Publish, and the receipt is written to Postgres with a public canonical URL. The URL won't render meaningfully until Step 7 ships `/p/[slug]`, but the receipt is real and queryable from the DB immediately.

---

## 1. Scope of this step

One API route + one OG card renderer + entity auto-creation logic. No new UI. No new public-facing routes.

What ships:

- `src/app/api/paste/publish/route.ts` — the POST handler
- `src/lib/paste/publish.ts` — the core logic (testable independently)
- `src/lib/paste/slug.ts` — slug generation with collision handling
- `src/lib/paste/og-card.ts` — receipt OG card renderer using `@vercel/og` (already in `package.json` per Step 1)
- `src/lib/entities.ts` — entity auto-creation helper (used here, useful for future flows)
- Update `src/app/paste/review/page.tsx` — wire the Publish button to call the new endpoint (replace the disabled state)

What does NOT ship:

- `/p/[slug]` public page (Step 7)
- JSON-LD endpoint and Atlas role dereferencing (Step 7)
- Async L2 verification worker (Phase 1B)
- Attestation flow (Phase 1B)

---

## 2. Request and response contracts

### 2.1 Request

```ts
// POST /api/paste/publish
// Body: the draft from Redis, OR a draft_id pointing to a draft in Redis

interface PublishRequest {
  draft_id: string;              // points to Redis-stashed draft from Step 5
  // OR the full draft inline as fallback if Redis miss:
  draft?: PasteDraft;
}

interface PasteDraft {
  // From Step 5 — what the review screen accumulated
  url: string;
  source: ClassifierSource;
  event_type: EventType;
  title: string;
  description: string;
  occurred_at: string;           // ISO 8601
  occurred_at_precision: 'day' | 'month' | 'quarter' | 'year';
  artifacts: Artifact[];
  stack: StackElement[];
  outcomes: Outcome[];
  capabilities: string[];
  atlas_roles_confirmed: string[];   // roles the user kept/added
  atlas_roles_claimed: string[];     // roles the user explicitly added (not in classifier inferred)
  atlas_roles_inferred: string[];    // classifier output retained
  atlas_confidence: number;
  classifier_version: string;
  classifier_reasoning: string;
  visibility: 'public' | 'unlisted';
  wanted_attestation: boolean;
}
```

### 2.2 Response

```ts
// Success
{
  success: true,
  canonical_url: string,         // https://shipstacked.com/p/<slug>
  slug: string,
  id: string,                    // shipstacked:proof:<ulid>
  entity_canonical_url: string,  // https://shipstacked.com/u/<entity_slug>
}

// Failure
{
  success: false,
  error: 'unauthenticated' | 'invalid_draft' | 'draft_expired' | 'server_error',
  message: string,
}
```

Response shapes are intentionally narrow. No leak of internal IDs beyond what's already canonical.

---

## 3. Publish flow logic

The publish endpoint runs the following steps in order. If any step fails, return a 5xx and roll back the DB transaction.

### 3.1 Auth check

- Get the current Supabase session from cookies (server-side).
- If unauthenticated: return 401 with `error: 'unauthenticated'`. Client-side handler can redirect to `/login?return_to=/paste/review?draft=<id>`.

### 3.2 Resolve draft

- If `draft_id` is present: fetch from Redis at key `paste-draft:<id>`.
- If Redis returns nothing AND inline `draft` is in the body: use the inline draft (fallback path for expired drafts where the client cached the data).
- If both are missing: return 400 with `error: 'invalid_draft'`.
- If Redis returns something but it's malformed (zod validation against `PasteDraft` fails): return 400 with `error: 'invalid_draft'`.

### 3.3 Validate the draft

Use zod to validate `PasteDraft` against expected shapes. Be especially strict about:

- `atlas_roles_confirmed` is a subset of all Atlas v0.4 role IDs (query `atlas_roles` table where `atlas_version = 'v0.4'`, filter; do not throw on unknown IDs — just drop them with a warning logged)
- `occurred_at` is a valid ISO 8601 timestamp
- `event_type` is one of the 10 valid types in `proof-receipt-v0.1.ts`
- `title` is 1–80 chars, `description` is 1–2000 chars
- `artifacts[]` has at least 1 entry, each entry is a valid URL
- `visibility` is `'public'` or `'unlisted'`

### 3.4 Resolve or create the subject entity

This is the auto-creation logic flagged in Step 5 Section 7.

```sql
SELECT id, external_id, slug, display_name, canonical_url
FROM entities
WHERE owner_user_id = $1   -- auth.users.id
AND kind = 'human';
```

If a row exists: use it.
If no row exists: create one with:
- `external_id`: `shipstacked:entity:<ulid>`
- `kind`: `'human'`
- `display_name`: from the auth user's metadata (email prefix or full_name if present), fallback to "Builder"
- `slug`: generated from display_name, kebab-cased; collision-safe with short numeric suffix (see Section 4 for slug logic)
- `owner_user_id`: the authenticated user's id

Store entity creation in the same transaction as the receipt insert (Section 3.5).

### 3.5 Insert the proof receipt

Generate the receipt's identity fields:
- `external_id`: `shipstacked:proof:<ulid>`
- `slug`: generated from the title (see Section 4)
- `canonical_url`: `https://shipstacked.com/p/<slug>`

Build the row:

```ts
{
  external_id,
  slug,
  schema_version: '0.1',
  atlas_version: 'v0.4',
  subject_id: <entity.id from §3.4>,
  on_behalf_of_id: null,  // Phase 1A doesn't surface this
  event_type: draft.event_type,
  event_subtype: null,
  title: draft.title,
  description: draft.description,
  occurred_at: draft.occurred_at,
  occurred_at_precision: draft.occurred_at_precision,
  duration_seconds: null,
  artifacts: draft.artifacts,            // jsonb
  stack: draft.stack,                    // jsonb
  outcomes: draft.outcomes,              // jsonb
  capabilities: draft.capabilities,      // text[]
  atlas_claimed: draft.atlas_roles_claimed,
  atlas_inferred: draft.atlas_roles_inferred,
  atlas_confirmed: draft.atlas_roles_confirmed,
  atlas_confidence: draft.atlas_confidence,
  classifier_version: draft.classifier_version,
  classified_at: <now>,
  verification_level: <see §3.6>,
  visibility: draft.visibility,
  ingestion_source: 'paste',
  ingestion_metadata: {
    classifier_reasoning: draft.classifier_reasoning,
    wanted_attestation: draft.wanted_attestation,
    source: draft.source,
    url: draft.url,
  },
  issued_at: <now>,
  updated_at: <now>,
}
```

### 3.6 Determine initial verification level

- If `draft.source` was reachable when classified (the classifier returned `reachable: true` in Step 2), AND at least one artifact URL was successfully fetched by the analyzer: `verification_level = 'L1_artifact_confirmed'`
- Otherwise: `verification_level = 'L0_claimed'`

The draft from Step 5 should carry forward enough information to know this. If it doesn't, infer: the presence of `description_draft` populated with actual content (vs. empty) is a strong signal the analyzer reached the source.

### 3.7 Insert the initial verification_events row

```ts
{
  receipt_id: <new receipt.id>,
  level: <L0 or L1 from §3.6>,
  achieved_at: <now>,
  method: 'paste_flow_ingest',
  evidence: {
    classifier_source: draft.source,
    classifier_reachable: <bool>,
    analyzer_artifacts_count: draft.artifacts.length,
    classifier_confidence: draft.atlas_confidence,
  },
}
```

This is append-only. The publish writes ONE row here. Future L2/L3/L4 events append more rows; nothing in publish UPDATEs this table.

### 3.8 Generate and store the OG card

Use `@vercel/og` (already in the repo per Step 1's dependency check). Render a 1200×630 PNG with:

- Title (the receipt's title, truncated to ~60 chars with ellipsis if longer)
- Subject display name
- Verification badge ("L1 Artifact Confirmed" or "L0 Claimed")
- Top 2 confirmed Atlas roles (e.g., "A4 · B2")
- ShipStacked logo / wordmark

Save to Supabase Storage at `og-cards/<slug>.png` and record the public URL.

If OG card generation fails (rare but possible): do NOT fail the publish. Log the failure, leave `embed_card_url` null, the public page can render without an OG card and a follow-up job can regenerate.

The OG card URL gets stored in `ingestion_metadata.embed_card_url` (the schema spec calls for `embed_card_url` as a top-level field, but adding a column means a migration — defer to a small follow-up migration if needed, OR just store under ingestion_metadata for Phase 1A and migrate the column in Phase 1B). Make the choice and flag.

### 3.9 Update capabilities_vocab

For each tag in `draft.capabilities`:
- INSERT INTO capabilities_vocab (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET receipt_count = capabilities_vocab.receipt_count + 1

Idempotent. New tags get added. Existing tags get their counter incremented.

### 3.10 Insert ingestion_log row

```ts
{
  receipt_id: <new receipt.id>,
  source: 'paste',
  source_url: draft.url,
  request_id: <if available from Next.js request context>,
  status: 'published',
  error: null,
}
```

### 3.11 Delete the Redis draft

If we used `draft_id` from Redis, delete the key. The draft is committed; no need to keep it.

### 3.12 Return success

Return the response shape from Section 2.2.

---

## 4. Slug generation

Slugs are user-facing canonical URLs. They need to be:

- Kebab-case ASCII, lowercase
- 1–80 chars
- Unique within `proof_receipts` (and within `entities` for entity slugs)
- Collision-safe with deterministic suffixing

### 4.1 Algorithm

Function signature:

```ts
async function generateUniqueSlug(
  base: string,
  table: 'proof_receipts' | 'entities',
  supabase: SupabaseClient,
): Promise<string>
```

1. Normalize `base`:
   - Lowercase
   - Replace non-ASCII chars with closest ASCII (or strip)
   - Replace runs of non-alphanumeric with single hyphen
   - Trim leading/trailing hyphens
   - Truncate to 60 chars (leave 20 for suffix)
2. Query the table for slugs matching `base` or `base-<n>`:
   `SELECT slug FROM <table> WHERE slug = $1 OR slug LIKE $2`
3. If no match: return `base`
4. If matches: find the lowest unused integer suffix starting at 2, return `<base>-<n>`
5. Pathological case (1000+ collisions): append a 4-char random alphanumeric suffix

Examples:

- "Claude SDK for Python" → `claude-sdk-for-python`
- Same title pasted twice → `claude-sdk-for-python`, then `claude-sdk-for-python-2`
- Title with emoji and punctuation → strip cleanly

### 4.2 Concurrency

Use `INSERT ... ON CONFLICT (slug) DO NOTHING RETURNING *` patterns where possible. If a concurrent publish takes the slug we generated, retry with a fresh suffix. Max 5 retries before failing with `error: 'server_error'`.

---

## 5. Wiring the Publish button in /paste/review

Update `src/app/paste/review/page.tsx` (or the client component it imports):

- Replace the disabled Publish CTA with an enabled button
- On click:
  1. Serialize the current form state to a `PasteDraft` shape
  2. POST to `/api/paste/publish` with `{ draft_id, draft: <inline as fallback> }`
  3. While in flight: button shows "Publishing..." and is disabled
  4. On success: navigate to the returned `canonical_url` (`/p/<slug>`)
  5. On error: surface a clear inline message ("Publishing failed — try again?") without losing form state
- On auth error (401): redirect to `/login?return_to=/paste/review?draft=<id>`

The form state is already managed by the review component from Step 5. This adds the submission handler.

---

## 6. Error handling and edge cases

**Concurrent publishes by the same user:**
The user clicks Publish twice fast. We don't want two identical receipts. Mitigation:
- Generate the receipt's `external_id` (ULID) deterministically from `draft_id + user_id` (hash) — but actually ULIDs are random, so just rely on slug uniqueness and the Redis draft delete (§3.11). After the first publish deletes the Redis key, the second click gets `error: 'draft_expired'`.

**Draft expired (15 min Redis TTL elapsed):**
Client falls back to inline draft body. If inline draft is missing too: clear error message, suggest restarting from `/paste`.

**Entity slug collision on auto-create:**
Rare but possible (two users with same email prefix sign up simultaneously). The slug uniqueness algorithm (§4) handles it.

**OG card generation fails:**
Don't fail the publish. Receipt is created, log the OG card failure, the public page renders without it.

**Atlas role validation drops unknown IDs:**
If the user somehow submitted an Atlas role ID that doesn't exist in `atlas_roles` v0.4 (e.g., they hand-edited the request), filter it out silently, log the drop. Do not throw.

**Database transaction:**
Wrap §3.4 (entity), §3.5 (receipt), §3.7 (verification_events), §3.10 (ingestion_log) in a single transaction. §3.8 (OG card) and §3.9 (capabilities_vocab) can be outside the transaction — they're idempotent and non-critical.

---

## 7. Commit gate

Standard protocol:

- `npx tsc --noEmit` clean
- `npm run build` clean

Step 6-specific verification (terminal Claude can do all of this with curl + script, no browser needed):

1. **Direct API test (logged-in via service-role auth or a test session):**
   - POST to `/api/paste/publish` with a synthetic valid draft
   - Confirm 200 response with `canonical_url`, `slug`, `id`
   - Query Postgres directly: confirm the receipt row exists with correct fields
   - Confirm `verification_events` has one row at L1
   - Confirm `ingestion_log` has one row with `status='published'`
   - Confirm `capabilities_vocab` counters incremented for each tag
   - Confirm `og-cards/<slug>.png` exists in Supabase Storage

2. **Auto-entity-creation test:**
   - Use a freshly-created test user with no entity
   - POST a publish, confirm an `entities` row was created with sensible slug
   - POST a second publish for the same user, confirm a SECOND entity is NOT created (re-uses the first)

3. **Slug collision test:**
   - Publish two receipts with identical titles back-to-back
   - Confirm first slug is `<base>`, second is `<base>-2`

4. **Auth failure test:**
   - POST without a session cookie
   - Confirm 401 with `error: 'unauthenticated'`

5. **Expired draft test:**
   - POST with a `draft_id` that doesn't exist in Redis AND no inline draft
   - Confirm 400 with `error: 'draft_expired'` or `'invalid_draft'`

6. **Idempotency check:**
   - POST twice with the same `draft_id`
   - First succeeds, second returns `draft_expired` (because §3.11 deleted the key)

---

## 8. Deliverables (uncommitted, for Thomas review)

- `src/app/api/paste/publish/route.ts`
- `src/lib/paste/publish.ts`
- `src/lib/paste/slug.ts`
- `src/lib/paste/og-card.ts`
- `src/lib/entities.ts`
- Modified: `src/app/paste/review/page.tsx` (or the relevant client component)
- Modified: `src/lib/paste/draft.ts` (if Redis delete-on-publish logic lives there)
- Possibly: a new migration file if you decide to add `embed_card_url` as a top-level column (see §3.8)

---

## 9. Deviations / notes to flag

- **embed_card_url placement:** §3.8 raises whether to add a column now or stash under `ingestion_metadata` for Phase 1A. Flag your choice. My lean: stash under ingestion_metadata, add the column in Phase 1B alongside attestation work. Less migration churn.
- **ULID library:** Use whatever's already in `package.json` or pull `ulid` (small, single-purpose). Flag the choice.
- **OG card design:** I haven't specified a visual design. Default to: white background, large title, subject name below, verification badge as a colored pill in a corner, Atlas role IDs as small monospace text. Flag if you take a substantially different approach.
- **Supabase storage bucket name:** Use `og-cards` per §3.8. If the bucket doesn't exist yet, create it as public-read with a small init script. Flag whether the bucket needed to be created.
- **Transaction handling in Supabase:** Supabase client doesn't expose Postgres transactions cleanly across multiple table writes from the Node SDK. Use an RPC function (`begin_transaction`-style PL/pgSQL) OR accept that the writes are sequential and add a cleanup path if any fail mid-way. Flag your approach.

---

## 10. Escalate if

- The transaction handling story for multi-table writes from Node + Supabase is genuinely unclear (no clean SDK pattern). Propose options.
- OG card rendering with `@vercel/og` in this Next.js 16 setup hits a configuration issue (it's been finicky in older Next versions). Propose alternatives.
- The Supabase service role key in `.env.local` doesn't have permission to write to `og-cards/` storage bucket. Could happen if RLS or bucket policies are restrictive. Confirm bucket setup.
- The auto-entity-creation logic uncovers a conflict with the existing `/claim` flow (which also creates/modifies entities). Coordinate to keep the behaviors consistent.

---

## 11. Report when ready

- File structure
- Direct API test results (the 6 verification scenarios from §7)
- tsc + build pass confirmation
- Any deviations
- Note on transaction handling approach taken
- Note on embed_card_url placement decision (jsonb stash vs new column)
- Storage bucket creation status

DO NOT commit until Thomas reviews the test results.

---

## 12. After Step 6 ships

Step 6 closes the data-write path. After this, receipts exist in production Postgres with public canonical URLs — they just don't render anything meaningful at those URLs yet. Step 7 is the public face: `/p/[slug]` HTML + JSON-LD content negotiation + `/atlas/roles/[id]` dereferencing endpoints.

Manual browser smoke test of the full flow (`/paste` → `/paste/review` → Publish → `/p/[slug]`) happens at the end of Step 7, per the deferred-smoke-test agreement.

---

*End of Step 6 spec.*
