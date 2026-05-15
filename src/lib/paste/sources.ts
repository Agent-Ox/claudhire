/**
 * Hostname-pattern source detection for /api/paste/classify.
 * Hostname-only — does not fetch. Runtime signals (e.g. MCP handshake) are
 * handled separately in the classifier.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §4.2 step 3.
 */

import type { EventType } from '@/schemas/proof-receipt-v0.1';

export type ClassifierSource =
  | 'github'
  | 'lovable'
  | 'bolt'
  | 'v0'
  | 'replit'
  | 'vercel'
  | 'netlify'
  | 'mcp_server'
  | 'generic';

export const SOURCE_TO_EVENT_TYPE: Record<ClassifierSource, EventType> = {
  github: 'published_repo',
  lovable: 'shipped_app',
  bolt: 'shipped_app',
  v0: 'shipped_app',
  replit: 'shipped_app',
  vercel: 'shipped_app',
  netlify: 'shipped_app',
  mcp_server: 'deployed_mcp_server',
  generic: 'shipped_site',
};

/**
 * Detect source from a parsed URL using hostname + path patterns only.
 * Returns 'generic' for anything unrecognised. MCP detection is layered on
 * top of this by the classifier after the URL is fetched.
 */
export function detectSourceFromUrl(url: URL): ClassifierSource {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;

  // github.com/{owner}/{repo}
  if (host === 'github.com' || host === 'www.github.com') {
    const segments = path.split('/').filter(Boolean);
    if (segments.length >= 2) return 'github';
    return 'generic';
  }

  // Lovable
  if (host.endsWith('.lovable.app')) return 'lovable';
  if (host === 'lovable.dev' && path.startsWith('/projects/')) return 'lovable';

  // Bolt
  if (host.endsWith('.bolt.new')) return 'bolt';
  if (host === 'bolt.new' && path.startsWith('/~/')) return 'bolt';

  // v0
  if (host === 'v0.app' && path.startsWith('/chat/')) return 'v0';

  // Replit
  if (host === 'replit.com' && /^\/@[^/]+\/[^/]+/.test(path)) return 'replit';
  if (host.endsWith('.replit.app') || host.endsWith('.replit.dev')) return 'replit';

  // Vercel / Netlify deployment hosts (lower confidence — used by many builders)
  if (host.endsWith('.vercel.app')) return 'vercel';
  if (host.endsWith('.netlify.app')) return 'netlify';

  return 'generic';
}
