import type { AstroIntegration } from 'astro';
import { writeFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { buildURL, buildPillarURL, buildCategoryURL } from '../i18n/routes';
import { categoryMeta, type CategoryKey } from '../i18n/categories';

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

interface MdxMeta {
  slug: string;
  canonicalSlug: string;
  lang: 'en' | 'pl' | 'es';
  categorySlug: CategoryKey;
}

/** Minimal frontmatter parser — reads only the flat keys we need for sitemap emission. */
function parseFrontmatter(raw: string): Partial<MdxMeta> {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const body = m[1];
  const out: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawVal] = kv;
    const val = rawVal.trim().replace(/^["']|["']$/g, '');
    out[key] = val;
  }
  return out as Partial<MdxMeta>;
}

async function readAllTestFrontmatter(srcContentDir: string): Promise<MdxMeta[]> {
  const langs: Array<'en' | 'pl' | 'es'> = ['en', 'pl', 'es'];
  const entries: MdxMeta[] = [];
  for (const lang of langs) {
    const dir = path.join(srcContentDir, 'medical-tests', lang);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue; // locale directory may not exist (e.g., es when not yet populated)
    }
    for (const f of files) {
      if (!f.endsWith('.mdx')) continue;
      const raw = await readFile(path.join(dir, f), 'utf8');
      const fm = parseFrontmatter(raw);
      if (!fm.slug || !fm.canonicalSlug || !fm.lang || !fm.categorySlug) continue;
      entries.push({
        slug: fm.slug,
        canonicalSlug: fm.canonicalSlug,
        lang: fm.lang,
        categorySlug: fm.categorySlug as CategoryKey,
      });
    }
  }
  return entries;
}

/**
 * Custom Astro integration emitting per-locale sitemaps with inline hreflang
 * alternates and a sitemap index.
 *
 * Enumerates the homepage, pillar pages (EN/PL), category pages (EN/PL per
 * non-empty category), and every test-detail page across locales. Test-detail
 * pairs are reconciled by `canonicalSlug` so EN ↔ PL ↔ ES counterparts emit
 * mutual hreflang alternates.
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

        // ── 1. Homepages ────────────────────────────────────────────────
        const homepageAlternates = [
          { hreflang: 'en', href: `${site}/` },
          { hreflang: 'pl', href: `${site}/pl/` },
          { hreflang: 'es', href: `${site}/es/` },
          { hreflang: 'x-default', href: `${site}/` },
        ];
        enEntries.push({ loc: `${site}/`, lastmod: today, alternates: homepageAlternates });
        plEntries.push({ loc: `${site}/pl/`, lastmod: today, alternates: homepageAlternates });
        esEntries.push({ loc: `${site}/es/`, lastmod: today, alternates: homepageAlternates });

        // ── 2. Read all test-detail frontmatter, group by canonicalSlug ─
        const srcContentDir = path.join(process.cwd(), 'src', 'content');
        const allTests = await readAllTestFrontmatter(srcContentDir);

        const byCanonical = new Map<string, MdxMeta[]>();
        for (const e of allTests) {
          const arr = byCanonical.get(e.canonicalSlug) ?? [];
          arr.push(e);
          byCanonical.set(e.canonicalSlug, arr);
        }

        // ── 3. Pillar pages (EN + PL — no ES pillar in S1 scope) ────────
        const enPillar = `${site}${buildPillarURL('en', 'medical-tests')}`;
        const plPillar = `${site}${buildPillarURL('pl', 'medical-tests')}`;
        const pillarAlternates = [
          { hreflang: 'en', href: enPillar },
          { hreflang: 'pl', href: plPillar },
          { hreflang: 'x-default', href: enPillar },
        ];
        enEntries.push({ loc: enPillar, lastmod: today, alternates: pillarAlternates });
        plEntries.push({ loc: plPillar, lastmod: today, alternates: pillarAlternates });

        // ── 4. Category pages per non-empty category (EN + PL) ──────────
        const enByCategory = new Set(
          allTests.filter((e) => e.lang === 'en').map((e) => e.categorySlug),
        );
        const plByCategory = new Set(
          allTests.filter((e) => e.lang === 'pl').map((e) => e.categorySlug),
        );
        for (const key of Object.keys(categoryMeta) as CategoryKey[]) {
          const enURL = `${site}${buildCategoryURL('en', key)}`;
          const plURL = `${site}${buildCategoryURL('pl', key)}`;
          const catAlternates = [
            { hreflang: 'en', href: enURL },
            { hreflang: 'pl', href: plURL },
            { hreflang: 'x-default', href: enURL },
          ];
          if (enByCategory.has(key)) {
            enEntries.push({ loc: enURL, lastmod: today, alternates: catAlternates });
          }
          if (plByCategory.has(key)) {
            plEntries.push({ loc: plURL, lastmod: today, alternates: catAlternates });
          }
        }

        // ── 5. Test-detail pages (group by canonicalSlug for hreflang) ──
        const canonicalSlugs = Array.from(byCanonical.keys()).sort();
        for (const canonicalSlug of canonicalSlugs) {
          const variants = byCanonical.get(canonicalSlug)!;
          const alternates: Array<{ hreflang: string; href: string }> = [];
          let xDefault: string | undefined;
          for (const v of variants) {
            const href = `${site}${buildURL({ lang: v.lang, collection: 'medical-tests', slug: v.slug })}`;
            alternates.push({ hreflang: v.lang, href });
            if (v.lang === 'en') xDefault = href;
          }
          if (xDefault) alternates.push({ hreflang: 'x-default', href: xDefault });

          for (const v of variants) {
            const href = `${site}${buildURL({ lang: v.lang, collection: 'medical-tests', slug: v.slug })}`;
            const entry: SitemapEntry = { loc: href, lastmod: today, alternates };
            if (v.lang === 'en') enEntries.push(entry);
            else if (v.lang === 'pl') plEntries.push(entry);
            else if (v.lang === 'es') esEntries.push(entry);
          }
        }

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

        console.log(
          `[symptomatik-sitemap] wrote sitemap-en.xml (${enEntries.length}), sitemap-pl.xml (${plEntries.length}), sitemap-es.xml (${esEntries.length}), sitemap-index.xml`,
        );
      },
    },
  };
}
