/**
 * Paste draft stash for /paste → /paste/review handoff.
 *
 * After classify + analyze + atlas-classify finish on /paste, the combined
 * draft is written to Upstash Redis under a random `draft_id` with a 15-minute
 * TTL. /paste/review reads the draft by id and renders the editable form.
 * Step 6's publish action will read the draft, persist the receipt, then
 * delete the draft key.
 *
 * Spec: docs/v2/STEP_5_PASTE_UI_SPEC.md §3.
 */

import { Redis } from '@upstash/redis';
import { randomUUID } from 'node:crypto';
import type { AnalyzeResponse } from '@/lib/paste/analyzer';
import type { ClassifyResult } from '@/lib/paste/classifier';
import type { AtlasClassifierResult } from '@/services/atlas-classifier';

const DRAFT_TTL_SECONDS = 15 * 60;
const DRAFT_PREFIX = 'paste-draft:';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export interface PasteDraft {
  url: string;
  user_id: string;
  classify: Omit<ClassifyResult, 'cache_hit'>;
  analyze: AnalyzeResponse;
  atlas: AtlasClassifierResult;
  created_at: string;
}

function key(draftId: string): string {
  return `${DRAFT_PREFIX}${draftId}`;
}

export async function stashDraft(draft: PasteDraft): Promise<string> {
  const draftId = randomUUID();
  await redis.set(key(draftId), draft, { ex: DRAFT_TTL_SECONDS });
  return draftId;
}

export async function getDraft(draftId: string): Promise<PasteDraft | null> {
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return null;
  return await redis.get<PasteDraft>(key(draftId));
}

export async function deleteDraft(draftId: string): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(draftId)) return;
  await redis.del(key(draftId));
}
