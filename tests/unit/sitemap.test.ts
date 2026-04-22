import { describe, it, expect } from 'vitest';
import { buildSitemapXml, buildSitemapIndexXml } from '@/integrations/sitemap';

describe('buildSitemapXml', () => {
  it('wraps URLs with hreflang alternates', () => {
    const xml = buildSitemapXml([
      {
        loc: 'https://symptomatik.com/medical-tests/cbc/',
        lastmod: '2026-04-21',
        alternates: [
          { hreflang: 'en', href: 'https://symptomatik.com/medical-tests/cbc/' },
          { hreflang: 'pl', href: 'https://symptomatik.com/pl/badania/morfologia-krwi-cbc/' },
          { hreflang: 'x-default', href: 'https://symptomatik.com/medical-tests/cbc/' },
        ],
      },
    ]);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<loc>https://symptomatik.com/medical-tests/cbc/</loc>');
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="pl"');
    expect(xml).toContain('<lastmod>2026-04-21</lastmod>');
  });

  it('escapes XML special characters in URLs', () => {
    const xml = buildSitemapXml([
      { loc: 'https://symptomatik.com/a?b=c&d=e', lastmod: '2026-04-21', alternates: [] },
    ]);
    expect(xml).toContain('https://symptomatik.com/a?b=c&amp;d=e');
  });
});

describe('buildSitemapIndexXml', () => {
  it('lists per-locale sitemap URLs', () => {
    const xml = buildSitemapIndexXml([
      'https://symptomatik.com/sitemap-en.xml',
      'https://symptomatik.com/sitemap-pl.xml',
      'https://symptomatik.com/sitemap-es.xml',
    ]);
    expect(xml).toContain('<sitemap>');
    expect(xml).toContain('<loc>https://symptomatik.com/sitemap-en.xml</loc>');
    expect(xml).toContain('<loc>https://symptomatik.com/sitemap-es.xml</loc>');
  });
});
