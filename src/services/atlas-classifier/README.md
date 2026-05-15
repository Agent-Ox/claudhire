# Atlas Classifier

LLM-based classifier mapping `AtlasClassifierInput` → Atlas v0.4 role IDs +
confidence + reasoning. Single API call (`@anthropic-ai/sdk`) with strict
`tool_use` for structured output.

## Files

- `index.ts` — service entry. Exports `classifyAtlasRoles()` and the
  `classifier_version` constant.
- `prompts/_template.md` — system prompt template with a `[ROLE_TABLE]`
  placeholder. Edit this when the prompt phrasing or rules need to change.
- `prompts/v0.1.0.md` — **generated**. Hand-locked snapshot of the rendered
  prompt for `classifier_version = "claude-classifier-v0.1.0"`. Do not
  edit by hand. New Atlas version → new file, new constant.

## Why the prompt is hand-baked

Reproducibility. Pulling `atlas_roles` from Supabase at runtime means two
calls on different days could see different role lists if someone reseeds
the table. The prompt is generated once per Atlas version and committed.

## Regenerating the prompt

When Atlas changes (e.g. v0.4 → v0.5):

1. Reseed `atlas_roles` with the new rows.
2. Bump the `VERSION` constant at the top of
   `scripts/generate-classifier-prompt.ts` (e.g. `v0.1.0` → `v0.2.0`).
3. Run:

   ```
   node --env-file=.env.local scripts/generate-classifier-prompt.ts
   ```

   This writes `prompts/v0.2.0.md`. The old file (`v0.1.0.md`) is NEVER
   edited — it stays in the repo as the locked snapshot of its version.

4. Update `CLASSIFIER_VERSION` in `index.ts` to match the new file name.
5. Commit both files together.

Re-running the script regenerates the file from current DB state. Safe to
run anytime. If the file changes after a re-run within the same Atlas
version, that means either (a) `atlas_roles` was updated and the prompt
needs a bump, or (b) the template was edited.

## Test harness

`scripts/test-atlas-classifier.ts` calls `classifyAtlasRoles` directly
with three hardcoded fixtures (Anthropic SDK / Lovable e-commerce /
multi-agent customer support). Use it for fixture-driven validation when
the prompt or model changes. No temporary API routes — keeps production
routes clean.

## Versioning discipline

- `prompts/vX.Y.Z.md` is immutable once committed. Bug fixes → new version.
- `CLASSIFIER_VERSION` in `index.ts` and the active prompt file name must
  match. Receipts store the version they were classified under so the
  graph can be re-classified deterministically on bump.
