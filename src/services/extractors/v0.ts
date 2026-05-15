/**
 * v0 source extractor.
 *
 * Recognized URLs:
 *   - https://v0.app/chat/{id}    (current format)
 *   - https://v0.dev/r/{id}       (legacy format — still seen in shared links)
 *
 * Strategy: OG harvest from classifier metadata + a supplementary fetch of
 * the page to scrape for the Vercel deploy URL (v0 → Vercel deploy is the
 * canonical flow). Falls back gracefully when:
 *   - the chat is private/unlisted (OG fields will be sparse — synthesize a
 *     "v0 chat <id-prefix>" title)
 *   - the page fetch times out or returns non-HTML (no deploy artifact, but
 *     the URL itself is still emitted).
 *
 * Default stack assumption: Next.js + React (v0's documented output stack).
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

const USER_AGENT = 'ShipStacked-Analyzer/0.1';
const PAGE_FETCH_TIMEOUT_MS = 5_000;
const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;

const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'dashboard', match: /\bdashboard\b/i },
  { tag: 'landing-page', match: /\blanding[- ]page\b/i },
  { tag: 'agent-orchestration', match: /\bagent[s]?\b/i },
];

function harvestCapabilities(text: string): string[] {
  const out = new Set<string>();
  for (const { tag, match } of CAPABILITY_TERMS) if (match.test(text)) out.add(tag);
  return [...out];
}

function v0ChatId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split('/').filter(Boolean);
  if (host === 'v0.app' && parts[0] === 'chat' && parts[1]) return parts[1];
  if (host === 'v0.dev' && parts[0] === 'r' && parts[1]) return parts[1];
  return null;
}

/**
 * Look for the user's deployed Vercel URL in the page body. Excludes v0's
 * own infrastructure (v0.app, v0.dev) and Vercel's marketing pages. Returns
 * the first plausible candidate or null.
 */
function findVercelDeploy(html: string): string | null {
  const matches = html.match(
    /https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.vercel\.app(?:\/[^\s"')<>]*)?/gi
  );
  if (!matches) return null;
  for (const m of matches) {
    const lower = m.toLowerCase();
    if (lower.includes('v0.app') || lower.includes('v0.dev')) continue;
    if (lower.includes('vercel.com')) continue;
    return m;
  }
  return null;
}

async function fetchPageBody(url: URL): Promise<string | null> {
  const c = new AbortController();
  setTimeout(() => c.abort(), PAGE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url.href, {
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: c.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.toLowerCase().includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function extractV0(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url, classifierMetadata: m } = input;
  const chatId = v0ChatId(url);

  const ogTitle = m.title?.trim();
  const fallbackTitle = chatId ? `v0 chat ${chatId.slice(0, 8)}` : 'v0 chat';
  const title_draft = (ogTitle || fallbackTitle).slice(0, MAX_TITLE);
  const description_draft = (m.description ?? '').slice(0, MAX_DESCRIPTION);

  const artifacts: Artifact[] = [];
  artifacts.push({
    kind: 'url',
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

  // Supplementary fetch for the deploy URL. Page-not-fetchable / private
  // chats just skip this artifact — no throw.
  // TODO: skip body fetch when classifier metadata is empty — saves ~5s on
  // invalid/private chat URLs. Defer until real-world latency complaints.
  const body = await fetchPageBody(url);
  if (body) {
    const deploy = findVercelDeploy(body);
    if (deploy && artifacts.length < MAX_ARTIFACTS) {
      artifacts.push({ kind: 'deployment', url: deploy });
    }
  }

  // v0's documented output stack. next/react ride together; tailwind +
  // shadcn aren't in stack-vocab.json yet (intentional — vocab stays
  // declarative until we have a use case for them in downstream queries).
  const stack: StackElement[] = [
    { name: 'next', category: 'framework', role: 'primary' },
    { name: 'react', category: 'framework', role: 'secondary' },
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
