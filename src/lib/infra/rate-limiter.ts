export interface RateLimiter {
  check(
    key: string,
    opts: { limit: number; windowSec: number },
  ): Promise<{ allowed: boolean; remaining: number }>;
}

// ─────────────────────────────────────────────────────────────────────
// In-memory impl (test double + local dev fallback)
// ─────────────────────────────────────────────────────────────────────

export class InMemoryRateLimiter implements RateLimiter {
  private store = new Map<string, { count: number; resetAt: number }>();

  async check(
    key: string,
    opts: { limit: number; windowSec: number },
  ): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const entry = this.store.get(key);
    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 });
      return { allowed: true, remaining: opts.limit - 1 };
    }
    if (entry.count >= opts.limit) {
      return { allowed: false, remaining: 0 };
    }
    entry.count++;
    return { allowed: true, remaining: opts.limit - entry.count };
  }
}

// ─────────────────────────────────────────────────────────────────────
// Cloudflare KV impl — used when S2 API routes land
// ─────────────────────────────────────────────────────────────────────

// KVNamespace type is provided by @cloudflare/workers-types at runtime in production.
// Kept narrow and local so CF types don't leak into app code.
interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

export class CFKVRateLimiter implements RateLimiter {
  constructor(private readonly kv: KVNamespaceLike) {}

  async check(
    key: string,
    opts: { limit: number; windowSec: number },
  ): Promise<{ allowed: boolean; remaining: number }> {
    const raw = await this.kv.get(key);
    const now = Date.now();
    if (!raw) {
      await this.kv.put(
        key,
        JSON.stringify({ count: 1, resetAt: now + opts.windowSec * 1000 }),
        { expirationTtl: opts.windowSec },
      );
      return { allowed: true, remaining: opts.limit - 1 };
    }
    const entry = JSON.parse(raw) as { count: number; resetAt: number };
    if (entry.count >= opts.limit) return { allowed: false, remaining: 0 };
    entry.count++;
    const ttl = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    await this.kv.put(key, JSON.stringify(entry), { expirationTtl: ttl });
    return { allowed: true, remaining: opts.limit - entry.count };
  }
}
