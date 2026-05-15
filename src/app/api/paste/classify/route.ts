/**
 * POST /api/paste/classify
 *
 * Step 2 of V2 Phase 1A. Given a URL, returns a source guess, fetched
 * metadata, and a candidate event_type. See docs/v2/SHIPSTACKED_V2_BUILD_SPEC.md §4.
 *
 * The route is a thin shell over src/lib/paste/classifier.ts:
 *   - rate limiting (30 req/min per IP, 200 req/min global)
 *   - URL validation
 *   - Upstash KV cache (24h TTL, keyed on the normalized URL)
 *   - delegate to classifyUrl()
 *   - cache the result and return.
 */

import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { rateLimit } from '@/lib/rateLimit';
import {
  type ClassifyResult,
  InvalidUrlError,
  classifyUrl,
  normalizeUrlForCache,
  validateUrl,
} from '@/lib/paste/classifier';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const CACHE_TTL_SECONDS = 24 * 60 * 60;
const RATE_WINDOW_SECONDS = 60;
const RATE_PER_IP = 30;
const RATE_GLOBAL = 200;

type CachedPayload = Omit<ClassifyResult, 'cache_hit'>;

function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

export async function POST(req: Request) {
  // Per-IP and global rate limit. Per-IP first so a single noisy caller
  // doesn't get to count against everyone else's budget on the global limit.
  const ip = clientIp(req);
  const ipCheck = await rateLimit(
    `paste_classify_ip:${ip}`,
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
    'paste_classify_global',
    RATE_WINDOW_SECONDS,
    RATE_GLOBAL
  );
  if (!globalCheck.success) {
    const retryAfter = Math.max(1, globalCheck.reset - Math.floor(Date.now() / 1000));
    return NextResponse.json(
      { ok: false, error: 'Classifier is busy. Try again in a minute.' },
      { status: 429, headers: { 'retry-after': String(retryAfter) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Body must be JSON.' }, { status: 400 });
  }
  const rawUrl =
    body && typeof body === 'object' && 'url' in body
      ? (body as { url: unknown }).url
      : undefined;
  if (typeof rawUrl !== 'string') {
    return NextResponse.json({ ok: false, error: 'url field is required.' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = validateUrl(rawUrl);
  } catch (e) {
    if (e instanceof InvalidUrlError) {
      return NextResponse.json({ ok: false, error: e.reason }, { status: 400 });
    }
    throw e;
  }

  const cacheKey = `paste_classify:${normalizeUrlForCache(parsed)}`;
  const cached = await redis.get<CachedPayload>(cacheKey);
  if (cached) {
    return NextResponse.json({ ...cached, cache_hit: true });
  }

  const result = await classifyUrl(parsed);
  const toCache: CachedPayload = {
    source: result.source,
    reachable: result.reachable,
    http_status: result.http_status,
    metadata: result.metadata,
    event_type_candidate: result.event_type_candidate,
  };
  // Cache reachable AND unreachable results to absorb retry storms on bad
  // URLs. 24h TTL per spec.
  await redis.set(cacheKey, toCache, { ex: CACHE_TTL_SECONDS });

  return NextResponse.json(result);
}
