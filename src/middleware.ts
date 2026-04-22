import type { MiddlewareHandler } from 'astro';
import type { Locale } from '@/i18n/locales';

export function resolveLocale(url: URL): Locale {
  const segments = url.pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first === 'pl') return 'pl';
  if (first === 'es') return 'es';
  return 'en';
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const { url } = context;
  const segments = url.pathname.split('/').filter(Boolean);

  // Strip accidental /en/ prefix → 301 to unprefixed root.
  if (segments[0] === 'en') {
    const stripped = segments.slice(1).join('/');
    const target = stripped === '' ? '/' : `/${stripped}/`;
    return context.redirect(target, 301);
  }

  context.locals.locale = resolveLocale(url);
  return next();
};
