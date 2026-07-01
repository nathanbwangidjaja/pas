import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Guards the paid OCR endpoint. When Upstash is configured this is a real distributed limiter
// (works across serverless instances); otherwise it falls back to a per-instance in-memory
// count so local dev runs without it. Either way: 8 requests per minute per key.
const LIMIT = 8;

const upstash =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(LIMIT, "1 m"),
        prefix: "pas/ocr",
        analytics: false,
      })
    : null;

const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

function memoryLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

/** True when this key has gone over the limit and the request should be rejected. */
export async function isRateLimited(key: string): Promise<boolean> {
  if (upstash) {
    const { success } = await upstash.limit(key);
    return !success;
  }
  return memoryLimited(key);
}
