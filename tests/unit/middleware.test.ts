import { describe, it, expect, vi } from 'vitest';
import { onRequest, resolveLocale } from '@/middleware';

function makeContext(url: string) {
  return {
    request: new Request(url),
    url: new URL(url),
    locals: {} as Record<string, unknown>,
    redirect: (location: string, status: number) =>
      new Response(null, { status, headers: { Location: location } }),
  };
}

describe('resolveLocale', () => {
  it('returns "en" for root', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/'))).toBe('en');
  });
  it('returns "en" for /medical-tests/...', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/medical-tests/cbc/'))).toBe('en');
  });
  it('returns "pl" for /pl/...', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/pl/badania/cbc/'))).toBe('pl');
  });
  it('returns "es" for /es/...', () => {
    expect(resolveLocale(new URL('https://symptomatik.com/es/pruebas/cbc/'))).toBe('es');
  });
});

describe('onRequest middleware', () => {
  it('passes non-/en/ requests through to next() and sets locale=en on root', async () => {
    const ctx = makeContext('https://symptomatik.com/medical-tests/cbc/');
    const next = vi.fn().mockResolvedValue(new Response('ok'));
    const res = await onRequest(ctx as any, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    expect(ctx.locals.locale).toBe('en');
  });

  it('attaches locale to locals for PL paths', async () => {
    const ctx = makeContext('https://symptomatik.com/pl/badania/cbc/');
    const next = vi.fn().mockResolvedValue(new Response('ok'));
    await onRequest(ctx as any, next);
    expect(ctx.locals.locale).toBe('pl');
  });

  it('301-redirects /en/... to unprefixed', async () => {
    const ctx = makeContext('https://symptomatik.com/en/medical-tests/cbc/');
    const next = vi.fn();
    const res = await onRequest(ctx as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/medical-tests/cbc/');
  });

  it('301-redirects bare /en/ to /', async () => {
    const ctx = makeContext('https://symptomatik.com/en/');
    const res = await onRequest(ctx as any, vi.fn());
    expect(res.status).toBe(301);
    expect(res.headers.get('Location')).toBe('/');
  });
});
