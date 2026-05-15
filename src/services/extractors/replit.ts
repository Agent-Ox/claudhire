/**
 * Replit source extractor.
 *
 * Recognized URLs:
 *   - https://replit.com/@{user}/{project}     (repl page)
 *   - https://{slug}.replit.app                (deployed repl)
 *   - https://{slug}.repl.co                   (legacy deployed repl)
 *
 * Strategy: OG harvest from classifier metadata + URL-derived title fallback.
 * Replit has an undocumented GraphQL endpoint; we do not depend on it —
 * stays in OG/page-level territory. If we later see real-user pastes
 * producing poor extraction, revisit then with concrete evidence.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.2.
 */

import type { Artifact, StackElement } from '@/schemas/proof-receipt-v0.1';
import type { AnalyzeResponse, ExtractorInput } from '@/lib/paste/analyzer';

const MAX_ARTIFACTS = 4;
const MAX_TITLE = 80;
const MAX_DESCRIPTION = 2000;

const CAPABILITY_TERMS: ReadonlyArray<{ tag: string; match: RegExp }> = [
  { tag: 'agent-orchestration', match: /\bagent[s]?\b/i },
  { tag: 'tutorial', match: /\btutorial\b|\blearn(ing)?\b/i },
  { tag: 'dashboard', match: /\bdashboard\b/i },
  { tag: 'api', match: /\bapi\b/i },
];

function harvestCapabilities(text: string): string[] {
  const out = new Set<string>();
  for (const { tag, match } of CAPABILITY_TERMS) if (match.test(text)) out.add(tag);
  return [...out];
}

function prettifySlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => (w.length <= 2 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(' ');
}

interface ReplitInfo {
  kind: Artifact['kind'];
  user: string | null;
  project: string | null;
}

function classifyReplitUrl(url: URL): ReplitInfo {
  const host = url.hostname.toLowerCase();
  if (host === 'replit.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0]?.startsWith('@') && parts[1]) {
      return { kind: 'repo', user: parts[0].slice(1), project: parts[1] };
    }
    return { kind: 'url', user: null, project: null };
  }
  if (host.endsWith('.replit.app')) {
    return { kind: 'deployment', user: null, project: host.slice(0, -'.replit.app'.length) };
  }
  if (host.endsWith('.repl.co')) {
    return { kind: 'deployment', user: null, project: host.slice(0, -'.repl.co'.length) };
  }
  return { kind: 'url', user: null, project: null };
}

/**
 * Parse a primary language hint from OG description (e.g. "A Python repl by
 * user"). Replit's surfacing of language has shifted over time — this is a
 * best-effort signal, not a guarantee.
 */
function inferLanguageFromText(text: string): StackElement | null {
  const map: Record<string, string> = {
    python: 'python',
    'node.js': 'javascript',
    nodejs: 'javascript',
    javascript: 'javascript',
    typescript: 'typescript',
    ruby: 'ruby',
    go: 'go',
    rust: 'rust',
    java: 'java',
    swift: 'swift',
    kotlin: 'kotlin',
  };
  const lower = text.toLowerCase();
  for (const [key, canonical] of Object.entries(map)) {
    const re = new RegExp(`\\b${key.replace('.', '\\.')}\\b`, 'i');
    if (re.test(lower)) {
      return { name: canonical, category: 'language', role: 'primary' };
    }
  }
  return null;
}

export async function extractReplit(input: ExtractorInput): Promise<AnalyzeResponse> {
  const { url, classifierMetadata: m } = input;
  const info = classifyReplitUrl(url);

  let fallbackTitle = '';
  if (info.user && info.project) {
    fallbackTitle = `${prettifySlug(info.project)} by ${info.user}`;
  } else if (info.project) {
    fallbackTitle = prettifySlug(info.project);
  }
  const title_draft = (m.title?.trim() || fallbackTitle).slice(0, MAX_TITLE);
  const description_draft = (m.description ?? '').slice(0, MAX_DESCRIPTION);

  const artifacts: Artifact[] = [];
  artifacts.push({
    kind: info.kind,
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
  const lang = inferLanguageFromText(`${m.title ?? ''} ${m.description ?? ''}`);
  if (lang) stack.push(lang);

  return {
    title_draft,
    description_draft,
    artifacts: artifacts.slice(0, MAX_ARTIFACTS),
    stack,
    outcomes_suggestions: [],
    capabilities: harvestCapabilities(description_draft),
  };
}
