import type { CollectionEntry } from 'astro:content';
import { buildURL, type Collection } from '@/i18n/routes';
import type { Locale } from '@/i18n/locales';

export interface CanonicalURLArgs {
  site: string;
  lang: Locale;
  collection: Collection;
  slug: string;
}

export function canonicalURL(args: CanonicalURLArgs): string {
  const site = args.site.replace(/\/$/, '');
  const pathname = buildURL({ lang: args.lang, collection: args.collection, slug: args.slug });
  return `${site}${pathname}`;
}

export interface Alternate {
  hreflang: string;
  href: string;
}

export interface AlternatesArgs<C extends Collection> {
  entries: CollectionEntry<C>[];
  site: string;
  collection: C;
}

export function alternatesFor<C extends Collection>(args: AlternatesArgs<C>): Alternate[] {
  const alts: Alternate[] = [];
  let enHref: string | null = null;

  for (const e of args.entries) {
    const data = e.data as { lang: Locale; slug: string };
    const href = canonicalURL({ site: args.site, lang: data.lang, collection: args.collection, slug: data.slug });
    alts.push({ hreflang: data.lang, href });
    if (data.lang === 'en') enHref = href;
  }

  // x-default points to EN when EN exists; otherwise the first alternate.
  const defaultHref = enHref ?? alts[0]?.href;
  if (defaultHref) alts.push({ hreflang: 'x-default', href: defaultHref });

  return alts;
}
