/**
 * Lovable source extractor.
 *
 * Recognized URLs:
 *   - https://{slug}.lovable.app             (deployed project)
 *   - https://lovable.dev/projects/{id}      (project page)
 *
 * Strategy: OG harvest from classifier metadata (already fetched in Step 2)
 * + slug-derived title fallback + Lovable's known default stack as supporting
 * entries. No supplementary fetches in Part B — the OG-rich shareable pages
 * Lovable serves already give the classifier everything we need.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;

/**
 * Capability terms — minimal harvest from the OG description. Keep local;
 * vocabularies diverge by platform per [[chat-claude]] guidance on premature
 * centralization. Lift to shared config only when extractors converge.
 */
const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'rag-pipeline', match: /\brag\b|retrieval[- ]augmented/i },
  { tag: 'agent-orchestration', match: /\bagent[s]?\b|\bmulti[- ]?agent\b/i },
  { tag: 'crm', match: /\bcrm\b/i },
  { tag: 'dashboard', match: /\bdashboard\b/i },
  { tag: 'marketplace', match: /\bmarketplace\b/i },
];

function harvestCapabilities(text: string): string[] {
  const out = new Set<string>();
  for (const { tag, match } of CAPABILITY_TERMS) if (match.test(text)) out.add(tag);
  return [...out];
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Extract a project slug/id from either URL form. Returns null if the URL
 * doesn't match a recognized Lovable pattern (caller routed in error).
 */
function lovableSlug(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host.endsWith('.lovable.app')) {
    return host.slice(0, -'.lovable.app'.length);
  }
  if (host === 'lovable.dev' && url.pathname.startsWith('/projects/')) {
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[1] ?? null;
  }
  return null;
}

export async function extractLovable(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url, classifierMetadata: m } = input;
  const slug = lovableSlug(url);
  const isDeployment = url.hostname.toLowerCase().endsWith('.lovable.app');

  const title_draft = (m.title?.trim() || (slug ? slugToTitle(slug) : '')).slice(0, MAX_TITLE);
  const description_draft = (m.description ?? '').slice(0, MAX_DESCRIPTION);

  const artifacts: Artifact[] = [];
  artifacts.push({
    kind: isDeployment ? 'deployment' : 'url',
    url: url.href,
    ...(title_draft ? { title: title_draft } : {}),
    fetched_at: new Date().toISOString(),
  });
  if (m.og_image) {
    artifacts.push({
      kind: 'screenshot',
      url: m.og_image,
      ...(title_draft ? { title: `${title_draft} — preview` } : {}),
    });
  }

  // Lovable's documented default stack. All supporting — Lovable abstracts
  // the stack from the builder, so we can't claim "primary" for any of these
  // without inspecting the actual code (out of scope for Part B).
  const stack: StackElement[] = [
    { name: 'react', category: 'framework', role: 'supporting' },
    { name: 'supabase', category: 'infra', role: 'supporting' },
  ];

  return {
    title_draft,
    description_draft,
    artifacts: artifacts.slice(0, MAX_ARTIFACTS),
    stack,
    outcomes_suggestions: [],
    capabilities: harvestCapabilities(description_draft),
  };
}
