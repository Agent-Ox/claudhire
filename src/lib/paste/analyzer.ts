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
import { extractReplit } from '@/services/extractors/replit';
import { extractVercel } from '@/services/extractors/vercel';
import { extractNetlify } from '@/services/extractors/netlify';
import { extractMcpServer } from '@/services/extractors/mcp_server';

export interface ExtractorInput {
  url: URL;
  classifierMetadata: ClassifierMetadata;
}

/**
 * Cross-extractor classification signal. Emitted when an extractor detects
 * a fingerprint from a different platform on the URL it's processing — e.g.
 * vercel.ts spotting a Lovable build hosted on *.vercel.app. The note is
 * surfaced to callers (paste/review UI, future re-routing logic) but
 * extractors do NOT reroute themselves. Part D will decide whether to wire
 * automatic reclassification once we see production data on how often this
 * fires.
 */
export interface ClassificationNote {
  detected_builder: 'lovable' | 'v0' | 'bolt';
  message: string;
}

export interface AnalyzeResponse {
  title_draft: string;
  description_draft: string;
  artifacts: Artifact[];
  stack: StackElement[];
  outcomes_suggestions: Outcome[];
  capabilities: string[];
  classification_note?: ClassificationNote;
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
      case 'replit':
        return await extractReplit(extractorInput);
      case 'vercel':
        return await extractVercel(extractorInput);
      case 'netlify':
        return await extractNetlify(extractorInput);
      case 'mcp_server':
        return await extractMcpServer(extractorInput);
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
