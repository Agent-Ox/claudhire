import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const WINDOW_SECONDS = 60
const MAX_REQUESTS = 60

export async function rateLimit(
  key: string,
  windowSeconds: number = WINDOW_SECONDS,
  maxRequests: number = MAX_REQUESTS,
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const redisKey = `ratelimit:${key}`
  const now = Math.floor(Date.now() / 1000)
  const window = Math.floor(now / windowSeconds)
  const windowKey = `${redisKey}:${window}`

  const count = await redis.incr(windowKey)
  if (count === 1) {
    await redis.expire(windowKey, windowSeconds * 2)
  }

  const reset = (window + 1) * windowSeconds
  const remaining = Math.max(0, maxRequests - count)
  const success = count <= maxRequests

  return { success, remaining, reset }
}
