/**
 * URL classifier for /api/paste/classify.
 *
 * Pure logic — no Next.js dependencies, no Redis. Caller (the route handler)
 * threads cache reads/writes and rate limiting around this.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §4.
 */

import type { EventType } from '@/schemas/proof-receipt-v0.1';
import {
  type ClassifierSource,
  SOURCE_TO_EVENT_TYPE,
  detectSourceFromUrl,
} from '@/lib/paste/sources';

const USER_AGENT = 'ShipStacked-Classifier/0.1';
const FETCH_TIMEOUT_MS = 5_000;
const MCP_PROBE_TIMEOUT_MS = 3_000;
const MAX_REDIRECTS = 3;
const SHIPSTACKED_HOSTS = new Set([
  'shipstacked.com',
  'www.shipstacked.com',
  'shipstacked.app',
]);

export interface ClassifierMetadata {
  title?: string;
  description?: string;
  og_image?: string;
  favicon?: string;
}

export interface ClassifyResult {
  source: ClassifierSource;
  reachable: boolean;
  http_status: number;
  metadata: ClassifierMetadata;
  event_type_candidate: EventType;
  cache_hit: boolean;
}

export class InvalidUrlError extends Error {
  constructor(public reason: string) {
    super(reason);
    this.name = 'InvalidUrlError';
  }
}

/**
 * Validate the input URL and return a parsed URL object.
 * Throws InvalidUrlError on failure — caller maps to HTTP 400.
 */
export function validateUrl(raw: string): URL {
  if (typeof raw !== 'string' || raw.length === 0) {
    throw new InvalidUrlError('URL is required');
  }
  if (raw.length > 2048) {
    throw new InvalidUrlError('URL is too long (max 2048 chars)');
  }
  // Yuki-class guard (Batch 7a): reject any whitespace in the raw string
  // before `new URL()` silently percent-encodes it. Covers leading/trailing
  // whitespace AND interior whitespace (space between URL and trailing prose,
  // tabs, newlines, etc.). `\s` matches all Unicode whitespace.
  if (raw.trim() !== raw) {
    throw new InvalidUrlError('URL has leading or trailing whitespace');
  }
  if (/\s/.test(raw)) {
    throw new InvalidUrlError('URL contains whitespace');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new InvalidUrlError('URL is not parseable');
  }
  if (parsed.protocol !== 'https:') {
    throw new InvalidUrlError('URL must use https://');
  }
  if (SHIPSTACKED_HOSTS.has(parsed.hostname.toLowerCase())) {
    throw new InvalidUrlError('URL must not be on shipstacked.com (self-import not supported)');
  }
  return parsed;
}

/**
 * Normalize a URL for cache keying. Strips query + fragment, lowercases the
 * host, removes a trailing slash on non-root paths.
 */
export function normalizeUrlForCache(u: URL): string {
  const path = u.pathname === '/' ? '/' : u.pathname.replace(/\/+$/, '');
  return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function attr(html: string, name: string): string | undefined {
  // Match attr="value" OR attr='value', case-insensitive attr name.
  const re = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i');
  const m = html.match(re);
  if (!m) return undefined;
  const v = m[1] ?? m[2];
  return v ? decodeHtmlEntities(v).trim() : undefined;
}

/**
 * Extract metadata from an HTML response by regex over the <head> section.
 * Lightweight by design — no cheerio. Falls back to scanning the first 64KB
 * of body if a closing </head> is not found.
 */
export function extractMetadata(html: string, baseUrl: URL): ClassifierMetadata {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html.slice(0, 64_000);

  const out: ClassifierMetadata = {};

  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i);
  if (titleMatch) {
    const t = decodeHtmlEntities(titleMatch[1]).trim().replace(/\s+/g, ' ');
    if (t) out.title = t.slice(0, 300);
  }

  const metas = head.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metas) {
    const name = attr(tag, 'name')?.toLowerCase();
    const property = attr(tag, 'property')?.toLowerCase();
    const content = attr(tag, 'content');
    if (!content) continue;
    if (!out.description && (name === 'description' || property === 'og:description')) {
      out.description = content.slice(0, 500);
    }
    if (!out.og_image && (property === 'og:image' || name === 'twitter:image')) {
      try {
        out.og_image = new URL(content, baseUrl).href;
      } catch {
        // ignore malformed
      }
    }
  }

  const links = head.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of links) {
    const rel = attr(tag, 'rel')?.toLowerCase();
    if (!rel) continue;
    if (rel.includes('icon')) {
      const href = attr(tag, 'href');
      if (href) {
        try {
          out.favicon = new URL(href, baseUrl).href;
          break;
        } catch {
          // ignore
        }
      }
    }
  }
  if (!out.favicon) {
    out.favicon = new URL('/favicon.ico', baseUrl).href;
  }

  return out;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}

/**
 * Fetch with manual redirect handling (per spec: no more than 3 redirects).
 * Returns the final response and the URL it landed on (which may differ from
 * the input if redirects were followed).
 */
async function fetchUrlBounded(start: URL): Promise<{ res: Response; finalUrl: URL }> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetchWithTimeout(
      current.href,
      {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'manual',
      },
      FETCH_TIMEOUT_MS
    );
    const status = res.status;
    if (status >= 300 && status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return { res, finalUrl: current };
      let next: URL;
      try {
        next = new URL(loc, current);
      } catch {
        return { res, finalUrl: current };
      }
      // After the redirect cap, return the redirect response itself so the
      // caller can record http_status without silently following further.
      if (hop === MAX_REDIRECTS) return { res, finalUrl: current };
      current = next;
      continue;
    }
    return { res, finalUrl: current };
  }
  // Unreachable, but TS likes the explicit return.
  throw new Error('redirect loop exit');
}

/**
 * Probe `<origin>/.well-known/mcp` to detect an MCP server. Returns true on
 * 200-ish response that looks like JSON OR if the primary response carried
 * an MCP-protocol header. Errors are swallowed (treated as not-MCP).
 */
async function probeMcp(origin: URL, primaryHeaders: Headers): Promise<boolean> {
  // Header-based detection on the primary response (cheap, no extra request).
  for (const [k] of primaryHeaders.entries()) {
    if (k.toLowerCase().startsWith('mcp-')) return true;
  }
  // Probe well-known endpoint.
  try {
    const wellKnown = new URL('/.well-known/mcp', origin);
    const res = await fetchWithTimeout(
      wellKnown.href,
      {
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT,
          accept: 'application/json',
        },
        redirect: 'follow',
      },
      MCP_PROBE_TIMEOUT_MS
    );
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.toLowerCase().includes('json')) return true;
    const text = await res.text();
    return text.trim().startsWith('{');
  } catch {
    return false;
  }
}

/**
 * Core classify operation — given a validated URL, returns a ClassifyResult.
 * Never throws on network errors; unreachable URLs return reachable: false
 * with the hostname-based source guess.
 */
export async function classifyUrl(url: URL): Promise<ClassifyResult> {
  const hostnameSource = detectSourceFromUrl(url);
  let metadata: ClassifierMetadata = {};
  let httpStatus = 0;
  let reachable = false;
  let finalSource: ClassifierSource = hostnameSource;

  try {
    const { res, finalUrl } = await fetchUrlBounded(url);
    httpStatus = res.status;
    reachable = res.ok;

    // Only attempt to read body if we got a successful HTML response.
    if (res.ok) {
      const ct = res.headers.get('content-type') ?? '';
      if (ct.toLowerCase().includes('text/html') || ct.length === 0) {
        const body = await res.text();
        metadata = extractMetadata(body, finalUrl);
      }
      // MCP layer: hostname detection misses MCP servers. Probe regardless of
      // hostnameSource, EXCEPT for github (never an MCP server endpoint) to
      // avoid wasteful probes.
      if (hostnameSource !== 'github') {
        const isMcp = await probeMcp(finalUrl, res.headers);
        if (isMcp) finalSource = 'mcp_server';
      }
    } else {
      // Drain the body to free the connection.
      try {
        await res.text();
      } catch {
        // ignore
      }
    }
  } catch {
    reachable = false;
    httpStatus = 0;
  }

  return {
    source: finalSource,
    reachable,
    http_status: httpStatus,
    metadata,
    event_type_candidate: SOURCE_TO_EVENT_TYPE[finalSource],
    cache_hit: false,
  };
}
