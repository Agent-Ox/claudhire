/**
 * Bolt source extractor.
 *
 * Recognized URLs:
 *   - https://bolt.new/~/{slug}        (Bolt project page)
 *   - https://{slug}.bolt.new          (deployed Bolt project, if exposed)
 *   - https://*.stackblitz.io          (StackBlitz underpins Bolt)
 *
 * Strategy: OG harvest from classifier metadata + URL-slug-derived title
 * fallback. No supplementary fetches — `bolt.new/api/projects/{slug}.json`
 * was investigated in Part B testing and returns 404 with HTML; the probe
 * code was removed per build-once principle. If real-world Bolt URLs later
 * reveal a useful endpoint, add it then at the specific shape we observe.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;

const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'rag-pipeline', match: /\brag\b|retrieval[- ]augmented/i },
  { tag: 'agent-orchestration', match: /\bagent[s]?\b|\bmulti[- ]?agent\b/i },
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

interface BoltKind {
  kind: Artifact['kind'];
  slug: string | null;
}

function classifyBoltUrl(url: URL): BoltKind {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (host === 'bolt.new' && path.startsWith('/~/')) {
    const parts = path.split('/').filter(Boolean);
    return { kind: 'url', slug: parts[1] ?? null };
  }
  if (host.endsWith('.bolt.new')) {
    return { kind: 'deployment', slug: host.slice(0, -'.bolt.new'.length) };
  }
  if (host.endsWith('.stackblitz.io')) {
    return { kind: 'deployment', slug: host.slice(0, -'.stackblitz.io'.length) };
  }
  return { kind: 'url', slug: null };
}

export async function extractBolt(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url, classifierMetadata: m } = input;
  const { kind, slug } = classifyBoltUrl(url);

  const title_draft = (m.title?.trim() || (slug ? slugToTitle(slug) : '')).slice(0, MAX_TITLE);
  const description_draft = (m.description ?? '').slice(0, MAX_DESCRIPTION);

  const artifacts: Artifact[] = [];
  artifacts.push({
    kind,
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

  // Stack inference for Bolt outputs is framework-dependent and not derivable
  // from URL alone. Left empty until real-user paste signal informs whether
  // a default assumption would be load-bearing or misleading.
  const stack: StackElement[] = [];

  return {
    title_draft,
    description_draft,
    artifacts: artifacts.slice(0, MAX_ARTIFACTS),
    stack,
    outcomes_suggestions: [],
    capabilities: harvestCapabilities(description_draft),
  };
}
