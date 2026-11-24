import type { NextRequest } from "next/server";

// Kept on globalThis so every API route (and dev hot-reload) shares one counter.
const g = globalThis as unknown as { __rateLimit?: Map<string, number[]> };
const store = (g.__rateLimit ||= new Map<string, number[]>());

export function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Sliding window: allows `limit` hits per `windowMs` for this key. */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const hits = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    store.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000)) };
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > 5000) {
    for (const [k, v] of store) if (!v.some((t) => now - t < windowMs)) store.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}
