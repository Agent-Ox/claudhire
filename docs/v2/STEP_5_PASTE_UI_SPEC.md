# ShipStacked V2 — Step 5: /paste and /paste/review UI

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Steps 1–4 (DB, classify, analyze, atlas-classify — all shipped)
**Output:** The first user-facing surface of V2. Two screens. The paste-flow becomes a real product.
**Status:** Ready to execute. No re-litigation of upstream design.

---

## 0. Where Step 5 sits in the pipeline

```
/paste (UI) → /paste/review (UI) → classify ✓ → analyze ✓ → atlas-classify ✓ → publish (Step 6) → /p/[slug] (Step 7)
       ↑
   You are here
```

Steps 2–4 are the data pipeline (backend). Step 5 is the front door. Step 6 wires the publish action. Step 7 is the public-facing receipt page. After Step 5, a user can paste a URL and review a draft receipt — they just can't publish it yet.

---

## 1. Scope of this step

Two routes, one form. No DB writes yet. No new APIs. Step 5 calls the existing classify and analyze endpoints, then calls `classifyAtlasRoles()` (the Step 4 service) directly from the server component or via a small wrapper route, then renders a review screen the user can edit.

What ships:

- `src/app/paste/page.tsx` — single-URL paste screen
- `src/app/paste/review/page.tsx` — draft receipt review screen
- Supporting client components for the review form
- (Optional, decide during build) `src/app/api/paste/classify-atlas/route.ts` — a small POST wrapper so the review screen can call the Atlas classifier from the client. Discuss in Section 4.

What does NOT ship:

- Publish API (Step 6)
- Receipt-creation in DB (Step 6)
- Public receipt page `/p/[slug]` (Step 7)
- Profile-as-index changes (post-Phase 1A)

---

## 2. The two screens

### 2.1 `/paste` — single input, single CTA

Brutally simple per the constitutional rule. One URL → one receipt.

Layout:

```
┌──────────────────────────────────────────────────────────┐
│                                                            │
│   Paste what you built.                                    │
│                                                            │
│   ┌────────────────────────────────────────────────────┐ │
│   │ https://...                                          │ │
│   └────────────────────────────────────────────────────┘ │
│                                                            │
│                                            [ Continue → ]  │
│                                                            │
│   Works with GitHub, Lovable, Bolt, v0, Replit,           │
│   Vercel, Netlify, MCP servers, or any deployed URL.      │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

Behavior:

1. User pastes a URL, clicks Continue (or hits Enter in the input).
2. Client validates: must be `https://`, must not be on `shipstacked.com`.
3. If not logged in: redirect to `/login?return_to=/paste&pasted_url=<encoded>`. After login, user lands back on `/paste` with the URL prefilled and flow auto-continues.
4. If logged in: call `POST /api/paste/classify` with `{ url }`.
5. While classify is in flight: show an interstitial state — "Reading your work..." with a subtle loader. Do not navigate yet.
6. On classify response, immediately call `POST /api/paste/analyze` with `{ url, source, metadata }` from the classify response.
7. While analyze is in flight: continue showing the interstitial. Update copy to "Reviewing your work..."
8. On analyze response, call the Atlas classifier (see Section 4 for client vs server placement).
9. Once classifier returns, navigate to `/paste/review` with state passed via URL search params or React Query / Next.js route state. Prefer a server-side temporary draft stash over URL params if the analyzer output is large — use Upstash Redis with a short TTL (15 min) keyed by a random draft_id, then `/paste/review?draft=<draft_id>` retrieves it.

Error states:

- Invalid URL → inline validation, don't submit
- Classify endpoint 5xx → show "Couldn't read that URL right now. Try again?" with the URL preserved
- Network failure → same
- Atlas classifier returns extremely low confidence (< 0.2) on top role → still navigate to review, but the review screen shows a "this didn't classify cleanly — pick a role yourself" hint

### 2.2 `/paste/review` — the review form

Single editable form. All fields pre-filled from the analyzer + classifier output. User confirms or edits.

Sections, in order:

**Title**
- Text input, max 80 chars, prefilled with `title_draft` from analyzer
- Inline character counter

**What happened**
- Markdown textarea, max 2000 chars, prefilled with `description_draft`
- Render markdown preview on the right side (or below on mobile)
- Inline character counter

**When**
- Date picker, default = today
- Precision selector with options: day / month / quarter / year
- Default precision: day

**Atlas roles we detected**
- Show inferred roles from the classifier as a checkbox list:
  ```
  ☑ A4 — Agent Workflow Implementer  (92% confidence)
  ☑ B2 — Agent Reliability Engineer  (high overlap)
  ☐ A1 — AI Integration Operator  (54%)
  ```
- Pre-check roles where the classifier returned them in `inferred[]`
- Show confidence as a percentage or text descriptor next to each
- Allow user to UNCHECK any inferred role
- Allow user to ADD any Atlas role via a searchable dropdown (queries `atlas_roles` table where `atlas_version = 'v0.4'`)
- Show the classifier's reasoning text below the list, in a smaller font:
  ```
  We classified this based on: LangGraph + production deployment +
  measurable uptime outcome.
  ```
- This is the trust UX. The user sees what we inferred AND can correct it. The classifier's confidence is visible.

**Stack we detected**
- Show stack chips from analyzer output
- Each chip is removable (X button)
- "+ Add" affordance opens a small search to add stack elements from `stack-vocab.json`
- Sort: primary first, then secondary, then supporting

**Outcomes (optional, +trust hint)**
- Empty list by default
- "+ Add outcome" button opens a small form: kind (dropdown), value (number, optional), unit (text, optional), description (textarea)
- Show a "(+trust)" hint next to the section title indicating outcomes increase receipt credibility

**Attestation (optional, +trust hint)**
- Phase 1A: a button that reads "Request attestation (coming soon)"
- Clicking it shows a modal/note explaining attestations and that the feature is shipping in Phase 1B
- Store the user's intent (e.g., a flag `wanted_attestation: true`) on the draft so Step 6 can record it

**Visibility**
- Toggle / radio between Public and Unlisted
- Default: Public
- Phase 1A does not surface the Private option — schema supports it, UI surfaces only public/unlisted

**Verification ladder preview**
- Show the ladder visually, with the level this receipt will achieve highlighted:
  ```
  ● L1 Artifact Confirmed       (auto, on publish)
  ○ L2 Technically Checked      (auto, ~minutes after publish)
  ○ L3 Externally Attested      (request signature later)
  ○ L4 Cryptographically Signed (future)
  ```
- The current state should be L1 if classify confirmed the URL is reachable, or L0 if unreachable

**Footer CTA**
- Single button: "Publish proof receipt →"
- In Step 5: this button is DISABLED with copy "Publish ships in Step 6"
- OR, if you prefer: button is enabled but POST goes to `/api/paste/publish` which returns 501 Not Implemented. Either approach is fine — discuss in build.
- Why we don't wire publish in Step 5: Step 6 owns DB writes, slug generation, OG card rendering. Keep the seams clean.

---

## 3. State management

The review screen needs the analyzer + classifier output passed in. Two options:

**Option A — Server-side draft stash (recommended)**

- After `/paste` runs classify → analyze → atlas-classify, it stores the combined result in Upstash Redis with a random `draft_id` (UUID).
- Key: `paste-draft:{draft_id}`, TTL 15 minutes
- Navigate to `/paste/review?draft=<draft_id>`
- The review server component reads the draft from Redis, renders the form
- On form changes, client component holds local state
- The actual publish (Step 6) reads the draft from Redis, persists the receipt, then deletes the draft key

Pros: clean URL, no leaking analyzer output through URL params, large analyzer payloads are fine, auditable trail.

Cons: requires one extra Redis read.

**Option B — Pass everything through URL search params or sessionStorage**

Quick to build, leaks state to URL, ugly for large analyzer output. Avoid.

**Recommendation: Option A.** Use Upstash Redis (already in env). Pattern:

```
POST /api/paste/draft  → stores draft, returns { draft_id }
GET  /api/paste/draft?id={draft_id}  → returns draft (server-rendered review)
```

Or just do the stash inline in the paste page's server action — pick whatever feels native to Next 16.

---

## 4. Atlas classifier call — client or server?

The Atlas classifier (Step 4 service) is server-only (it uses `ANTHROPIC_API_KEY`). Cannot be called from the client directly. Two placements:

**Option 1 — Server action in /paste**

The `/paste` page is a server component or has a server action. After analyze returns, call `classifyAtlasRoles()` server-side, then stash the combined draft (analyzer + classifier result) in Redis, navigate to `/paste/review`.

Pros: no public API for the classifier (good), server-side call is fast, classifier never exposed.

Cons: server action surface inside a Next.js page.

**Option 2 — Internal API route**

`POST /api/paste/classify-atlas` — internal route, only called from `/paste` server-side code (still no client calls). Returns the classifier result.

Pros: testable independently of the page.

Cons: another route to maintain; the classifier already has a CLI test harness from Step 4.

**Recommendation: Option 1.** Server action inside the paste flow. Keep the classifier internal. No new public surface.

---

## 5. Authentication

The `/paste` flow requires the user to be logged in (so we can attribute the receipt to an `entities` row).

Pattern:

1. User hits `/paste` while logged out → middleware or server-side check redirects to `/login?return_to=/paste&pasted_url=<encoded_url_if_any>`
2. After login, redirect handler lands them on `/paste`. If `pasted_url` is set in the redirect URL, the input is prefilled and the form is auto-submitted.
3. On `/paste/review`, an unauthenticated user is redirected to `/login?return_to=<full_review_url>`.

The repo already has auth wiring (Supabase auth, `/login` route, `/join` route per the file listing in Step 0). Use what's there. Do not introduce new auth surface.

---

## 6. Styling and design system

Match the existing site:
- Inline styles per the `/atlas` page convention OR Tailwind v4 per the rest of the app — match whatever is canonical
- Reuse colors, fonts, button styles from existing routes
- Mobile-first: form should work on a phone

Do NOT pull in a new component library. Use what's there.

Loading interstitial during classify → analyze → atlas-classify: subtle, no spinner-fest. Three sequential states:

```
Reading your work...
Reviewing your work...
Mapping to the Atlas...
```

Each lasts as long as the corresponding API call. Use suspense / streaming if it fits naturally; otherwise sequential.

---

## 7. The entity creation question

This is a real design call worth flagging now.

When a logged-in user pastes their first URL, they may or may not already have an `entities` row. Options:

**Option A — Auto-create entity on first paste.**

When `/paste` runs and the user has no `entities` row matching their `auth.users.id`, create one with `kind = 'human'`, `display_name` from their auth profile, slug from email-prefix or generated. Continue with the flow.

**Option B — Force entity creation via `/claim` before allowing /paste.**

Redirect users without an entity to `/claim` first. Once they've claimed, they can paste.

**Recommendation: Option A.** Auto-create. Lowest friction. `/claim` becomes about role-claiming on top of the existing entity, not about entity creation.

This auto-creation logic belongs in Step 6 (publish), not Step 5 — Step 5 just reads the auth state. But flagging here so it's not a surprise when Step 6 fires.

For Step 5: if the user has no entity yet, the review screen still works (it's just a draft). The publish CTA being disabled means we don't need to resolve entity creation in this step. Step 6 handles it.

---

## 8. Deliverables (uncommitted, for Thomas review)

- `src/app/paste/page.tsx`
- `src/app/paste/review/page.tsx`
- `src/components/paste/PasteForm.tsx` (client component for /paste input)
- `src/components/paste/ReviewForm.tsx` (client component for /paste/review form)
- `src/components/paste/AtlasRoleSelector.tsx` (searchable dropdown for adding roles)
- `src/components/paste/StackChipList.tsx` (stack chip display + removal)
- `src/components/paste/VerificationLadder.tsx` (visual ladder display)
- `src/lib/paste/draft.ts` (Redis stash/fetch helpers)
- Optional: `src/app/api/paste/draft/route.ts` if the stash needs a dedicated route

---

## 9. Commit gate

Standard protocol:

- `npx tsc --noEmit` clean
- `npm run build` clean

Plus Step 5-specific:

- Visit `/paste` locally on `npm run dev`
- Paste a GitHub URL (one we've tested before), confirm it reaches `/paste/review` with prefilled fields
- Edit the title, confirm form state updates
- Toggle an Atlas role on/off, confirm state updates
- Add a stack element, confirm it appears
- Add an outcome, confirm it appears in the form
- Click Publish — confirm it does NOT submit (disabled or returns 501, per the chosen approach)
- Test mobile breakpoint — form remains usable

---

## 10. Deviations / notes to flag

- If Next 16 introduces a server-actions pattern that's substantially cleaner than the proposed flow, use it and flag the deviation.
- If the existing site uses Tailwind v4 for some routes and inline styles for `/atlas`, pick the more-common pattern across the codebase and stick to it. Flag the choice.
- If the draft stash via Redis introduces meaningful latency on the navigation, sessionStorage as a fallback is acceptable for non-sensitive draft data — flag the decision.
- If the AtlasRoleSelector requires fetching all 40 v0.4 roles client-side, prefer a paginated/search-as-you-type endpoint over loading all roles upfront. Flag if you build it differently.
- If you discover a bug in the analyzer or classifier output during Step 5 wiring, do NOT fix it in this step. Flag and we ship a small follow-up commit specifically for that fix. Keep Step 5 scoped to UI.

---

## 11. Escalate if

- The existing auth wiring doesn't support `return_to` redirects cleanly
- The analyzer + classifier output is materially larger than expected (>50KB) and Redis stash needs different handling
- A design decision around mobile UX requires a real opinion (e.g., do we collapse the markdown preview on mobile, or stack it below?)
- Form complexity exceeds what's reasonable to ship in a single PR — propose splitting into Part A (basic form) and Part B (advanced fields like outcomes/attestation)

---

## 12. Report when ready

- File structure
- A screenshot or text description of `/paste` and `/paste/review` rendered locally
- Result of end-to-end test (paste real URL → review screen shows correct prefilled state)
- tsc + build pass confirmation
- Any deviations
- Note on which placement option you took for the Atlas classifier (server action vs internal route)
- Note on whether mobile layout works

DO NOT commit until Thomas reviews the local rendered state.

---

*End of Step 5 spec.*
