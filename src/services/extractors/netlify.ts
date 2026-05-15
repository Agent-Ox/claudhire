/**
 * Netlify source extractor.
 *
 * URL pattern: *.netlify.app
 *
 * Simpler than the Vercel extractor — fewer AI-builder platforms default to
 * Netlify, so the cross-platform fingerprint search is omitted. Netlify is
 * dominant for static-site generators (Hugo, Jekyll, Eleventy, Astro), so
 * the generator meta tag is the strongest stack signal.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

const USER_AGENT = 'ShipStacked-Analyzer/0.1';
const FETCH_TIMEOUT_MS = 5_000;
const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;

const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'landing-page', match: /\blanding[- ]page\b/i },
  { tag: 'blog', match: /\bblog\b/i },
  { tag: 'docs', match: /\bdocs\b|\bdocumentation\b/i },
  { tag: 'portfolio', match: /\bportfolio\b/i },
];

function harvestCapabilities(text: string): string[] {
  const out = new Set<string>();
  for (const { tag, match } of CAPABILITY_TERMS) if (match.test(text)) out.add(tag);
  return [...out];
}

function prettifySubdomain(host: string): string {
  const sub = host.replace(/\.netlify\.app$/i, '');
  return sub
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

async function fetchHead(url: URL): Promise<string | null> {
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
    return headEnd > 0 ? body.slice(0, headEnd) : body.slice(0, 64_000);
  } catch {
    return null;
  }
}

function frameworkFromGenerator(head: string): StackElement | null {
  const m = head.match(/<meta\b[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i);
  if (!m) return null;
  const v = m[1].toLowerCase();
  // Map common generator markers to our vocab. Hugo/Jekyll/Eleventy aren't in
  // stack-vocab.json yet — we omit rather than fabricate vocab entries.
  if (v.includes('next.js') || v.includes('nextjs')) return { name: 'next', category: 'framework', role: 'primary' };
  if (v.includes('astro')) return { name: 'astro', category: 'framework', role: 'primary' };
  if (v.includes('svelte') || v.includes('sveltekit')) return { name: 'svelte', category: 'framework', role: 'primary' };
  return null;
}

export async function extractNetlify(input: ExtractorInput): Promise<AnalyzeResponse> {
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
  const head = await fetchHead(url);
  if (head) {
    const fw = frameworkFromGenerator(head);
    if (fw) {
      stack.push(fw);
      if (fw.name === 'next') {
        stack.push({ name: 'react', category: 'framework', role: 'secondary' });
      }
    }
  }

  return {
    title_draft,
    description_draft,
    artifacts: artifacts.slice(0, MAX_ARTIFACTS),
    stack,
    outcomes_suggestions: [],
    capabilities: harvestCapabilities(description_draft),
  };
}
