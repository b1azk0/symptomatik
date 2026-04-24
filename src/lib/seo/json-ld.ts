import type { Locale } from '@/i18n/locales';

export interface MedicalWebPageArgs {
  url: string;
  title: string;
  description: string;
  lastReviewed: Date;
  inLanguage: Locale;
  datePublished?: Date;
}

export function medicalWebPage(args: MedicalWebPageArgs): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    url: args.url,
    name: args.title,
    description: args.description,
    inLanguage: args.inLanguage,
    lastReviewed: args.lastReviewed.toISOString().slice(0, 10),
  };
  if (args.datePublished) {
    ld['datePublished'] = args.datePublished.toISOString().slice(0, 10);
  }
  return ld;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function breadcrumbList(items: BreadcrumbItem[]): {
  '@context': string;
  '@type': 'BreadcrumbList';
  itemListElement: Array<{ '@type': 'ListItem'; position: number; name: string; item?: string }>;
} {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, idx) => {
      const base = { '@type': 'ListItem' as const, position: idx + 1, name: it.label };
      return it.href ? { ...base, item: it.href } : base;
    }),
  };
}

export interface WebSiteArgs {
  site: string;
  name: string;
  inLanguage: Locale;
}

export function webSite(args: WebSiteArgs): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    url: args.site,
    name: args.name,
    inLanguage: args.inLanguage,
  };
}

export interface CollectionPageArgs {
  url: string;
  title: string;
  description: string;
  inLanguage: 'en' | 'pl' | 'es';
}

export function collectionPage(args: CollectionPageArgs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage' as const,
    url: args.url,
    name: args.title,
    description: args.description,
    inLanguage: args.inLanguage,
  };
}

export interface ItemListEntry {
  position: number;
  name: string;
  url: string;
}

export function itemList(entries: ItemListEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList' as const,
    itemListElement: entries.map((e) => ({
      '@type': 'ListItem' as const,
      position: e.position,
      name: e.name,
      url: e.url,
    })),
  };
}
