/**
 * Generic fallback extractor.
 *
 * Always succeeds. Uses the metadata already extracted by the classifier
 * (Step 2) — no new network calls. Serves as the safety net for the analyzer
 * dispatcher: unknown sources, extractor failures, and Phase 1A's not-yet-
 * implemented sources (lovable/bolt/v0/replit/vercel/netlify/mcp) all land
 * here in Part A.
 */

import type { Artifact } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

export async function extractGeneric(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url, classifierMetadata: m } = input;

  const primary: Artifact = {
    kind: 'url',
    url: url.href,
    ...(m.title ? { title: m.title } : {}),
    ...(m.description ? { description: m.description } : {}),
    fetched_at: new Date().toISOString(),
  };

  return {
    title_draft: m.title ?? '',
    description_draft: m.description ?? '',
    artifacts: [primary],
    stack: [],
    outcomes_suggestions: [],
    capabilities: [],
  };
}
