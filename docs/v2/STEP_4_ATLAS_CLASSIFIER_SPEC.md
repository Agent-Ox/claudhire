# ShipStacked V2 — Step 4: Atlas Classifier

**For:** Claude Code, executing in `shipstacked` repo
**Builds on:** Steps 1–3 (DB schema, classifier, analyzer — all shipped)
**Output:** The single LLM call in the paste pipeline. Maps analyzer output → atlas_roles[] with confidence + reasoning.
**Status:** Ready to execute. No re-litigation of upstream design.

---

## 0. Where Step 4 sits in the pipeline

```
/paste (UI) → classify (Step 2) → analyze (Step 3) → CLASSIFY ATLAS (Step 4) → publish (Step 6) → /p/[slug] (Step 7)
                                                              ↑
                                                          You are here
```

This is where the receipt becomes **classifiable** — analyzer output gets mapped into the Atlas v0.4 taxonomy seeded in Step 1. Every downstream system (search, ranking, profile-as-index, JSON-LD output) depends on this classification.

---

## 1. Scope of this step

Build a versioned, deterministic LLM classifier service. No UI. No DB writes yet — Step 6 wires it into publish. This step delivers:

- A service callable from anywhere in the codebase
- A versioned prompt with the full Atlas v0.4 role list baked in
- A script to regenerate the prompt when the taxonomy updates
- A CLI test harness for fixture-driven validation

---

## 2. Service interface

**Location:** `src/services/atlas-classifier/index.ts`

```ts
import type { EventType, Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';

export interface AtlasClassifierInput {
  event_type: EventType;
  title: string;
  description: string;
  artifacts: Artifact[];
  stack: StackElement[];
  capabilities: string[];
}

export interface AtlasClassifierResult {
  inferred: string[];          // Atlas role IDs, max 5
  confidence: number;          // 0.0–1.0, strongest role
  reasoning: string;           // <80 words, user-facing
  classifier_version: string;  // "claude-classifier-v0.1.0"
}

export async function classifyAtlasRoles(
  input: AtlasClassifierInput,
): Promise<AtlasClassifierResult>;
```

---

## 3. Implementation

### 3.1 LLM call

- SDK: `@anthropic-ai/sdk` (already in `package.json` per Step 1)
- Model: prefer `claude-sonnet-4-7` if the SDK version supports it; fall back to `claude-sonnet-4-6` if not. Check exact model string against the installed SDK's docs before hardcoding.
- Mode: **tool_use** with strict tool schema. Forces structured output, eliminates JSON parsing brittleness.
- `tool_choice`: `{ type: "tool", name: "classify_atlas_roles" }` — required, not optional
- One retry if no tool block returned. Hard fail on second miss with a clear error.

### 3.2 Tool schema

```json
{
  "name": "classify_atlas_roles",
  "description": "Classify a proof of work into ShipStacked Atlas roles.",
  "input_schema": {
    "type": "object",
    "properties": {
      "roles": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Atlas role IDs (e.g. A1, F3, G1). Max 5."
      },
      "confidence": {
        "type": "number",
        "minimum": 0,
        "maximum": 1,
        "description": "Confidence in the strongest role."
      },
      "reasoning": {
        "type": "string",
        "maxLength": 400,
        "description": "Short explanation, shown to user."
      }
    },
    "required": ["roles", "confidence", "reasoning"]
  }
}
```

### 3.3 Validation after tool call

- Reject any role ID not present in `atlas_roles` (`atlas_version = 'v0.4'`). Filter and warn rather than throw — model may occasionally return a v0.3 ID we don't want.
- Truncate `roles` to first 5 if model returns more.
- Clamp `confidence` to [0, 1] defensively.
- If reasoning exceeds 400 chars, truncate with ellipsis.

### 3.4 No streaming

This is a synchronous service call. Streaming adds complexity without UX value here — the caller (Step 6 publish) needs the full structured result before proceeding.

---

## 4. Prompt versioning

### 4.1 File layout

```
src/services/atlas-classifier/
├── index.ts                        # service entry point
├── prompts/
│   └── v0.1.0.md                   # generated, hand-locked
└── README.md                       # how to regenerate prompts
```

### 4.2 Versioning strategy: hand-baked, not dynamic

A versioned prompt must be **deterministic**. We do NOT dynamically pull `atlas_roles` from Supabase at runtime — that would mean two calls on different days could return different results because someone reseeded the table. That is the opposite of reproducibility.

**Rule:** The prompt is generated once per Atlas version and committed to the repo. When Atlas v0.5 lands, we manually update the prompt to v0.2.0 and bump `classifier_version`. The generation is scripted (Section 5), but the output is locked in git.

### 4.3 Prompt template

The file `src/services/atlas-classifier/prompts/v0.1.0.md`:

````md
You are the ShipStacked Atlas Classifier.

Your job: classify a piece of proof-of-work into ShipStacked Atlas roles.
The Atlas (v0.4) maps the labor market of the agentic economy into roles
organized into seven Parts:

- Part I — The Workforce (Clusters A–E)
- Part II — The Operators (Cluster F)
- Part III — The Compliance Layer
- Part IV — Alignment & Interpretability Research
- Part V — Model Training & RLHF
- Part VI — Industry Vertical AI Specialists
- Part VII — The Practitioner Layer (Cluster G)

You will be given a proof-of-work artifact (title, description, stack,
capabilities, event type) and you must return:

- **roles**: 1–5 Atlas role IDs that best describe this work. Most
  artifacts match 1–3 roles strongly. Do not pad to 5.
- **confidence**: 0.0–1.0, your confidence in the STRONGEST role match.
  Be honest:
  - 0.95+ means "obviously this"
  - 0.7–0.9 means "strong match"
  - 0.5–0.7 means "best guess but could be another"
  - Below 0.4 means you are guessing — say so in reasoning
- **reasoning**: <80 words. Name the role(s) and the specific signal in
  the artifact that triggered the match. This is shown to the user.

Rules:

- Only use role IDs from the Atlas v0.4 list below.
- Prefer specific roles over general. If work fits both A1 (general)
  and G3 (specific practitioner), return both — but rank by strength.
- Do not invent role IDs. If nothing fits, return the closest single
  role with confidence < 0.4 and explain why.
- Stack and capabilities are stronger signals than title alone. A
  "Claude SDK" repo is not automatically an A1 role — depends on what
  the artifact does, not what it mentions.
- A library/SDK that enables others to build is NOT itself an
  implementation role. Tools differ from work.

## Atlas v0.4 roles (the only valid role IDs)

[ROLE_TABLE]

---

Now classify the following proof-of-work. Use the `classify_atlas_roles`
tool to return your answer.
````

The `[ROLE_TABLE]` placeholder is filled by the generation script (Section 5) with one row per role:

```
- **A1** — AI Integration Operator. [short_description]
- **A2** — Forward Deployed Engineer (FDE — AI flavor). [short_description]
...
- **G6** — AI-Native Education Practitioner. [short_description]
```

### 4.4 Runtime caller

At call time, the service:

1. Reads the prompt file as system message (loaded once at module init, cached in module scope).
2. Constructs the user message from `AtlasClassifierInput` as a structured block:

   ```
   Event type: shipped_app
   Title: ...
   Description: ...
   Stack: claude-sonnet-4-7 (primary), langgraph (primary), supabase (supporting)
   Capabilities: agent-orchestration, customer-support
   Artifacts:
   - repo: https://github.com/...
   - deployment: https://...
   ```

3. Calls Anthropic API with `tool_choice` forcing the tool.
4. Parses tool_use block, validates per Section 3.3, returns `AtlasClassifierResult`.

---

## 5. Prompt generation script

**Location:** `scripts/generate-classifier-prompt.ts`

### 5.1 Behavior

1. Connect to Supabase using `SUPABASE_SERVICE_ROLE_KEY`.
2. Query: `SELECT role_id, cluster, name, short_description FROM atlas_roles WHERE atlas_version = 'v0.4' ORDER BY cluster, role_id`.
3. Read the prompt template at `src/services/atlas-classifier/prompts/_template.md` (committed separately so the template is editable without rerunning generation).
4. Render the `[ROLE_TABLE]` placeholder with the queried rows.
5. Write to `src/services/atlas-classifier/prompts/v0.1.0.md`.

### 5.2 Idempotency

Re-running the script regenerates the file from current DB state. Safe to run anytime. If the file changes after a re-run, that means either (a) `atlas_roles` was updated and the prompt needs the bump, or (b) the template was edited.

### 5.3 Versioning discipline

When Atlas v0.5 ships:
1. Reseed `atlas_roles` with v0.5 rows.
2. Update the prompt VERSION constant in the generator script to `v0.2.0`.
3. Run the script — it writes `prompts/v0.2.0.md`.
4. Update `classifier_version` constant in `src/services/atlas-classifier/index.ts` to match.
5. Commit both files together.

`v0.1.0.md` is NEVER edited in-place after first commit. New versions get new files.

---

## 6. Test harness (CLI)

**Location:** `scripts/test-atlas-classifier.ts`

No temporary API routes for testing. Production routes stay clean. Test harness is a CLI that calls `classifyAtlasRoles` directly with hardcoded or stdin-provided fixtures.

### 6.1 Three required fixtures

**Fixture A — Anthropic SDK repo** (real, from Step 3 testing)

```ts
{
  event_type: 'published_repo',
  title: 'Claude SDK for Python',
  description: '# Claude SDK for Python\n\nThe Claude SDK for Python provides access to the Claude API from Python applications. ...',
  artifacts: [{ kind: 'repo', url: 'https://github.com/anthropics/anthropic-sdk-python' }],
  stack: [
    { name: 'python', category: 'language', role: 'primary' },
    { name: 'ruby', category: 'language', role: 'supporting' },
  ],
  capabilities: [],
}
```

**Expected:** Low confidence (< 0.5). This is a library, not a deployment. Honest classifier should say so. Possible closest role: D3 (Prompt and Context Engineer — enables this kind of work) or no strong match.

**Fixture B — Lovable e-commerce site** (real, from Step 3 testing)

```ts
{
  event_type: 'shipped_app',
  title: 'Linea - Minimalist jewelry crafted for the modern individual',
  description: 'E-commerce website for Linea - Minimalist jewelry crafted for the modern individual.',
  artifacts: [{ kind: 'deployment', url: 'https://linea-jewelry.lovable.app/' }],
  stack: [
    { name: 'react', category: 'framework', role: 'supporting' },
    { name: 'supabase', category: 'infra', role: 'supporting' },
  ],
  capabilities: [],
}
```

**Expected:** Moderate confidence. Possible roles: F1 (Solo Operator if this is the operator's own customer-facing thing), or A1 (Integration Operator if framed as built-for-a-client). Reasoning should reflect ambiguity.

**Fixture C — Multi-agent customer support system** (synthetic, strong signal)

```ts
{
  event_type: 'shipped_workflow',
  title: 'Multi-agent customer support system shipped to production',
  description: 'Built using LangGraph + Claude. Handles tier-1 customer queries with 87% deflection. 6-month uptime > 99.5%. Integrated with Zendesk and Linear for escalation.',
  artifacts: [
    { kind: 'deployment', url: 'https://example.com/agent-dashboard' },
    { kind: 'repo', url: 'https://github.com/example/support-agent' },
  ],
  stack: [
    { name: 'langgraph', category: 'framework', role: 'primary' },
    { name: 'claude-sonnet-4-7', category: 'model', role: 'primary' },
    { name: 'supabase', category: 'infra', role: 'supporting' },
  ],
  capabilities: ['agent-orchestration', 'customer-support', 'tool-use'],
}
```

**Expected:** High confidence (0.8+). Strong match on A4 (Agent Workflow Implementer). Possibly F4 (Function Agent Operator) if framed as a service. Reasoning should name LangGraph + production deployment + measurable outcome.

### 6.2 Output format

For each fixture, print:

```
=== Fixture A: Anthropic SDK ===
roles: [...]
confidence: 0.32
reasoning: "..."
classifier_version: claude-classifier-v0.1.0
expected: low confidence, closest D3 or no-strong-match
match-judgment: PASS / REVIEW / FAIL
```

The `match-judgment` is your assessment, not the model's — print "REVIEW" if results are unexpected; Thomas reviews.

---

## 7. Commit gate

Standard protocol:

- `npx tsc --noEmit` clean
- `npm run build` clean

Plus Step 4-specific:

- All three fixtures run successfully (no exceptions, valid tool output)
- Confidence values are not systematically pinned to one end (e.g., not all returning 0.9, not all returning 0.4) — that would indicate prompt miscalibration

---

## 8. Deliverables (uncommitted, for Thomas review)

- `src/services/atlas-classifier/index.ts`
- `src/services/atlas-classifier/prompts/_template.md`
- `src/services/atlas-classifier/prompts/v0.1.0.md` (generated)
- `src/services/atlas-classifier/README.md`
- `scripts/generate-classifier-prompt.ts`
- `scripts/test-atlas-classifier.ts`

---

## 9. Deviations / notes to flag

- **Model string**: confirm exact name (`claude-sonnet-4-7` vs `claude-sonnet-4-6`) against installed `@anthropic-ai/sdk` docs. Flag if only 4-6 is available.
- **Prompt size**: 74 atlas_roles × ~30 words each ≈ 2200 tokens. Well within context limits. Flag if generator produces something materially larger.
- **Confidence calibration**: if all three fixtures return confidence > 0.8, model is overconfident — prompt needs tightening before Step 6. If all return < 0.5, model is under-asserting — also needs tuning.
- **Role ID drift**: if the model returns role IDs not in v0.4 (e.g. hallucinated A8 or invented Z1), flag — prompt may need stricter "ONLY these IDs" framing.
- **Atlas v0.3 contamination**: prompt only includes v0.4 roles. If model returns v0.3-only roles, validator filters them. Flag if it happens frequently.

---

## 10. After Step 4 ships

Step 4 closes when:
- Service is callable from anywhere via `classifyAtlasRoles()`
- Prompt v0.1.0.md is committed and generation script is repeatable
- Three fixtures produce sensible output with appropriate confidence calibration
- tsc + build clean
- Vercel deploy green

Step 5 opens next: `/paste` and `/paste/review` UI. The full user-facing path begins.

---

## 11. Escalate if

- Anthropic SDK does not support the chosen model string
- Tool_use returns malformed JSON on both first call and retry (unlikely but possible — surface the exact error)
- Atlas role count in prompt exceeds 4000 tokens (would require trimming descriptions)
- Test fixtures produce systematically miscalibrated confidence and prompt tuning isn't bringing it into range within 2 iterations

---

*End of Step 4 spec.*
