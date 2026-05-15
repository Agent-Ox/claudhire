/**
 * Vercel source extractor.
 *
 * URL pattern: *.vercel.app
 *
 * Tricky case: many AI-builder platforms (Lovable, v0, Bolt previews) deploy
 * to *.vercel.app. The classifier prefers builder-specific sources when the
 * hostname matches (e.g. *.lovable.app). This extractor only fires when the
 * URL is on vercel.app AND no builder pattern matched — i.e. a custom
 * Vercel deployment. We still scan the body for known builder fingerprints
 * and log when found, so we can audit how often the classifier misses an
 * upstream signal. Cross-extractor delegation is intentionally NOT done in
 * Part C — flagged for a Part D follow-up if it proves load-bearing.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type {
  AnalyzeResponse,
  ClassificationNote,
  ExtractorInput,
} from '@/lib/paste/analyzer';

const USER_AGENT = 'ShipStacked-Analyzer/0.1';
const FETCH_TIMEOUT_MS = 5_000;
const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;

const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'agent-orchestration', match: /\bagent[s]?\b/i },
  { tag: 'dashboard', match: /\bdashboard\b/i },
  { tag: 'landing-page', match: /\blanding[- ]page\b/i },
  { tag: 'api', match: /\bapi\b/i },
];

function harvestCapabilities(text: string): string[] {
  const out = new Set<string>();
  for (const { tag, match } of CAPABILITY_TERMS) if (match.test(text)) out.add(tag);
  return [...out];
}

function prettifySubdomain(host: string): string {
  const sub = host.replace(/\.vercel\.app$/i, '');
  return sub
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

async function fetchPageBody(url: URL): Promise<{ body: string; head: string } | null> {
  const c = new AbortController();
  setTimeout(() => c.abort(), FETCH_TIMEOUT_MS);
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
    const body = await res.text();
    const headEnd = body.search(/<\/head\s*>/i);
    const head = headEnd > 0 ? body.slice(0, headEnd) : body.slice(0, 64_000);
    return { body, head };
  } catch {
    return null;
  }
}

interface FrameworkDetection {
  framework: string | null;
  source: 'next-data' | 'generator-meta' | 'next-asset-path' | null;
}

function detectFramework(body: string, head: string): FrameworkDetection {
  if (/<script[^>]*id=["']__NEXT_DATA__["']/i.test(body)) {
    return { framework: 'next', source: 'next-data' };
  }
  const gen = head.match(/<meta\b[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
  if (gen) {
    const v = gen[1].toLowerCase();
    if (v.includes('next.js') || v.includes('nextjs')) return { framework: 'next', source: 'generator-meta' };
    if (v.includes('astro')) return { framework: 'astro', source: 'generator-meta' };
    if (v.includes('svelte')) return { framework: 'svelte', source: 'generator-meta' };
  }
  if (/\/_next\/static\//.test(body)) {
    return { framework: 'next', source: 'next-asset-path' };
  }
  return { framework: null, source: null };
}

/**
 * Look for AI-builder fingerprints in the body — Lovable's gpt-engineer
 * uploads URL, v0's shadcn class patterns, Bolt's stackblitz markers.
 * Returns the first match. Surfaced to the caller via classification_note
 * on the response; we do not reroute. Re-routing is a Part D consideration
 * once production data shows how often this fires.
 */
function detectBuilderFingerprint(body: string): ClassificationNote['detected_builder'] | null {
  if (/storage\.googleapis\.com\/gpt-engineer-file-uploads/.test(body)) return 'lovable';
  if (/data-v0-source|v0\.app\/chat/.test(body)) return 'v0';
  if (/stackblitz\.com|bolt\.new/.test(body)) return 'bolt';
  return null;
}

const BUILDER_NOTE_MESSAGES: Record<ClassificationNote['detected_builder'], string> = {
  lovable: 'This appears to be a Lovable output deployed via Vercel. Consider re-classifying as Lovable.',
  v0: 'This appears to be a v0 output deployed via Vercel. Consider re-classifying as v0.',
  bolt: 'This appears to be a Bolt output deployed via Vercel. Consider re-classifying as Bolt.',
};

export async function extractVercel(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url, classifierMetadata: m } = input;
  const host = url.hostname.toLowerCase();
  const fallbackTitle = prettifySubdomain(host) || host;
  const title_draft = (m.title?.trim() || fallbackTitle).slice(0, MAX_TITLE);
  const description_draft = (m.description ?? '').slice(0, MAX_DESCRIPTION);

  const artifacts: Artifact[] = [];
  artifacts.push({
    kind: 'deployment',
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

  const stack: StackElement[] = [];
  let classification_note: ClassificationNote | undefined;
  const fetched = await fetchPageBody(url);
  if (fetched) {
    const det = detectFramework(fetched.body, fetched.head);
    if (det.framework) {
      stack.push({ name: det.framework, category: 'framework', role: 'primary' });
      // next requires react under the hood
      if (det.framework === 'next') {
        stack.push({ name: 'react', category: 'framework', role: 'secondary' });
      }
    }
    const builder = detectBuilderFingerprint(fetched.body);
    if (builder) {
      classification_note = {
        detected_builder: builder,
        message: BUILDER_NOTE_MESSAGES[builder],
      };
    }
  }

  return {
    title_draft,
    description_draft,
    artifacts: artifacts.slice(0, MAX_ARTIFACTS),
    stack,
    outcomes_suggestions: [],
    capabilities: harvestCapabilities(description_draft),
    ...(classification_note ? { classification_note } : {}),
  };
}
