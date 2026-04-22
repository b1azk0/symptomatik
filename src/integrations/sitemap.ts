import type { AstroIntegration } from 'astro';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { buildURL } from '../i18n/routes';

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  alternates: Array<{ hreflang: string; href: string }>;
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function buildSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries.map((e) => {
    const alts = e.alternates
      .map((a) => `    <xhtml:link rel="alternate" hreflang="${xmlEscape(a.hreflang)}" href="${xmlEscape(a.href)}" />`)
      .join('\n');
    return `  <url>
    <loc>${xmlEscape(e.loc)}</loc>
    <lastmod>${xmlEscape(e.lastmod)}</lastmod>
${alts}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
}

export function buildSitemapIndexXml(urls: string[]): string {
  const items = urls.map((u) => `  <sitemap>
    <loc>${xmlEscape(u)}</loc>
  </sitemap>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</sitemapindex>
`;
}

/**
 * Custom Astro integration emitting per-locale sitemaps with inline hreflang
 * alternates and a sitemap index.
 *
 * NOTE for S0: this integration hard-codes the CBC page pair as the only
 * content entry, which matches the S0 "golden path" scope (one validated
 * content page per locale). When S1 imports all 102 tests, replace the
 * hard-coded addPair() calls with a full content-collection traversal.
 */
export default function sitemapIntegration(options: { site: string }): AstroIntegration {
  return {
    name: 'symptomatik-sitemap',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const distDir = dir.pathname;
        const site = options.site.replace(/\/$/, '');
        const today = new Date().toISOString().slice(0, 10);

        const enEntries: SitemapEntry[] = [];
        const plEntries: SitemapEntry[] = [];
        const esEntries: SitemapEntry[] = [];

        const homepageAlternates = [
          { hreflang: 'en', href: `${site}/` },
          { hreflang: 'pl', href: `${site}/pl/` },
          { hreflang: 'es', href: `${site}/es/` },
          { hreflang: 'x-default', href: `${site}/` },
        ];
        enEntries.push({ loc: `${site}/`, lastmod: today, alternates: homepageAlternates });
        plEntries.push({ loc: `${site}/pl/`, lastmod: today, alternates: homepageAlternates });
        esEntries.push({ loc: `${site}/es/`, lastmod: today, alternates: homepageAlternates });

        const addContentPair = (enSlug: string, plSlug: string) => {
          const enURL = `${site}${buildURL({ lang: 'en', collection: 'medical-tests', slug: enSlug })}`;
          const plURL = `${site}${buildURL({ lang: 'pl', collection: 'medical-tests', slug: plSlug })}`;
          const alternates = [
            { hreflang: 'en', href: enURL },
            { hreflang: 'pl', href: plURL },
            { hreflang: 'x-default', href: enURL },
          ];
          enEntries.push({ loc: enURL, lastmod: today, alternates });
          plEntries.push({ loc: plURL, lastmod: today, alternates });
        };

        // S0 content: just the CBC golden-path pair.
        // S1+ will replace this with a full content-collection traversal.
        addContentPair('complete-blood-count-cbc', 'morfologia-krwi-cbc');

        await writeFile(path.join(distDir, 'sitemap-en.xml'), buildSitemapXml(enEntries), 'utf8');
        await writeFile(path.join(distDir, 'sitemap-pl.xml'), buildSitemapXml(plEntries), 'utf8');
        await writeFile(path.join(distDir, 'sitemap-es.xml'), buildSitemapXml(esEntries), 'utf8');
        await writeFile(
          path.join(distDir, 'sitemap-index.xml'),
          buildSitemapIndexXml([
            `${site}/sitemap-en.xml`,
            `${site}/sitemap-pl.xml`,
            `${site}/sitemap-es.xml`,
          ]),
          'utf8',
        );

        console.log('[symptomatik-sitemap] wrote sitemap-en.xml, sitemap-pl.xml, sitemap-es.xml, sitemap-index.xml');
      },
    },
  };
}
