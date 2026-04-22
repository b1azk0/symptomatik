import { describe, it, expect } from 'vitest';
import type { RateLimiter } from '@/lib/infra/rate-limiter';
import { InMemoryRateLimiter } from '@/lib/infra/rate-limiter';

describe('InMemoryRateLimiter (test double)', () => {
  it('allows first N requests, denies after', async () => {
    const rl: RateLimiter = new InMemoryRateLimiter();
    const key = 'ip:1.2.3.4';
    const opts = { limit: 3, windowSec: 60 };

    expect((await rl.check(key, opts)).allowed).toBe(true);
    expect((await rl.check(key, opts)).allowed).toBe(true);
    const third = await rl.check(key, opts);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);

    const fourth = await rl.check(key, opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it('tracks separate keys independently', async () => {
    const rl: RateLimiter = new InMemoryRateLimiter();
    const opts = { limit: 1, windowSec: 60 };
    expect((await rl.check('a', opts)).allowed).toBe(true);
    expect((await rl.check('a', opts)).allowed).toBe(false);
    expect((await rl.check('b', opts)).allowed).toBe(true);
  });
});
