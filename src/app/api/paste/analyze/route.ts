/**
 * POST /api/paste/analyze
 *
 * Step 3 of V2 Phase 1A. Given a URL + the classifier's source guess + the
 * classifier's already-extracted metadata, runs the per-source extractor and
 * returns title/description drafts, artifacts, stack, capabilities.
 *
 * Reference: docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §5.
 */

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rateLimit';
import { analyzePastedUrl } from '@/lib/paste/analyzer';
import type { ClassifierMetadata } from '@/lib/paste/classifier';
import { InvalidUrlError, validateUrl } from '@/lib/paste/classifier';
import type { ClassifierSource } from '@/lib/paste/sources';

const RATE_WINDOW_SECONDS = 60;
const RATE_PER_IP = 30;
const RATE_GLOBAL = 200;

const VALID_SOURCES: ReadonlySet<ClassifierSource> = new Set<ClassifierSource>([
  'github',
  'lovable',
  'bolt',
  'v0',
  'replit',
  'vercel',
  'netlify',
  'mcp_server',
  'generic',
]);

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function parseMetadata(v: unknown): ClassifierMetadata {
  if (!v || typeof v !== 'object') return {};
  const o = v as Record<string, unknown>;
  const out: ClassifierMetadata = {};
  const title = asString(o.title);
  const description = asString(o.description);
  const og_image = asString(o.og_image);
  const favicon = asString(o.favicon);
  if (title) out.title = title;
  if (description) out.description = description;
  if (og_image) out.og_image = og_image;
  if (favicon) out.favicon = favicon;
  return out;
}

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipCheck = await rateLimit(
    `paste_analyze_ip:${ip}`,
    RATE_WINDOW_SECONDS,
    RATE_PER_IP
  );
  if (!ipCheck.success) {
    const retryAfter = Math.max(1, ipCheck.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    );
  }
  const globalCheck = await rateLimit(
    'paste_analyze_global',
    RATE_WINDOW_SECONDS,
    RATE_GLOBAL
  );
  if (!globalCheck.success) {
    const retryAfter = Math.max(1, globalCheck.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { ok: false, error: 'Analyzer is busy. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body must be JSON.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, error: 'Body must be a JSON object.' }, { status: 400 });
  }
  const o = body as Record<string, unknown>;
  const rawUrl = asString(o.url);
  const rawSource = asString(o.source);
  if (!rawUrl) {
    return NextResponse.json({ ok: false, error: 'url field is required.' }, { status: 400 });
  }
  if (!rawSource || !VALID_SOURCES.has(rawSource as ClassifierSource)) {
    return NextResponse.json(
      { ok: false, error: 'source field is required and must be a known ClassifierSource.' },
      { status: 400 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = validateUrl(rawUrl);
  } catch (e) {
    if (e instanceof InvalidUrlError) {
      return NextResponse.json({ ok: false, error: e.reason }, { status: 400 });
    }
    throw e;
  }

  const classifierMetadata = parseMetadata(o.metadata);

  const result = await analyzePastedUrl({
    url: parsedUrl,
    source: rawSource as ClassifierSource,
    classifierMetadata,
  });

  return NextResponse.json(result);
}
