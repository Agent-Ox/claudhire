/**
 * Analyzer dispatcher for /api/paste/analyze.
 *
 * Routes a (url, source, classifier metadata) tuple to the right extractor
 * under src/services/extractors/. Falls through to the generic extractor on
 * unknown source or extractor failure. Owns the shared AnalyzeResponse and
 * ExtractorInput types so both extractors and the route handler can import
 * the same shape.
 *
 * Part A ships github + generic. Parts B/C add lovable/bolt/v0 and
 * replit/vercel/netlify/mcp_server respectively — until then those sources
 * land in generic.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.
 */

import type { Artifact, Outcome, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { ClassifierSource } from '@/lib/paste/sources';
import type { ClassifierMetadata } from '@/lib/paste/classifier';
import { extractGitHub } from '@/services/extractors/github';
import { extractGeneric } from '@/services/extractors/generic';
import { extractLovable } from '@/services/extractors/lovable';
import { extractBolt } from '@/services/extractors/bolt';
import { extractV0 } from '@/services/extractors/v0';

export interface ExtractorInput {
  url: URL;
  classifierMetadata: ClassifierMetadata;
}

export interface AnalyzeResponse {
  title_draft: string;
  description_draft: string;
  artifacts: Artifact[];
  stack: StackElement[];
  outcomes_suggestions: Outcome[];
  capabilities: string[];
}

export interface AnalyzeInput {
  url: URL;
  source: ClassifierSource;
  classifierMetadata: ClassifierMetadata;
}

export async function analyzePastedUrl(input: AnalyzeInput): Promise<AnalyzeResponse> {
  const extractorInput: ExtractorInput = {
    url: input.url,
    classifierMetadata: input.classifierMetadata,
  };
  try {
    switch (input.source) {
      case 'github':
        return await extractGitHub(extractorInput);
      case 'lovable':
        return await extractLovable(extractorInput);
      case 'bolt':
        return await extractBolt(extractorInput);
      case 'v0':
        return await extractV0(extractorInput);
      // Part C will add: replit, vercel, netlify, mcp_server.
      case 'replit':
      case 'vercel':
      case 'netlify':
      case 'mcp_server':
      case 'generic':
      default:
        return await extractGeneric(extractorInput);
    }
  } catch {
    // Any extractor failure degrades to the generic passthrough rather than
    // bubbling up — the user can still publish at L0_claimed from this.
    return await extractGeneric(extractorInput);
  }
}
