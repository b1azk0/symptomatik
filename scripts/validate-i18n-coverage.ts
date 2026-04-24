#!/usr/bin/env tsx
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ui } from '../src/i18n/ui.ts';
import { locales } from '../src/i18n/locales.ts';
import { categoryMeta, type CategoryKey } from '../src/i18n/categories.ts';
import { buildPillarURL, buildCategoryURL } from '../src/i18n/routes.ts';

// ---------------------------------------------------------------------------
// UI-string coverage: every EN key must exist in every other locale.
// ---------------------------------------------------------------------------
const enKeys = Object.keys(ui.en);
let failed = 0;
for (const locale of locales) {
  const localeKeys = new Set(Object.keys(ui[locale]));
  for (const k of enKeys) {
    if (!localeKeys.has(k)) {
      console.error(`[i18n] missing key "${k}" in locale "${locale}"`);
      failed++;
    }
  }
}

// ---------------------------------------------------------------------------
// Route-pair coverage (S1): pillar + every category must resolve at EN and PL.
// If dist/client/ exists (post-build), verify the static HTML actually shipped.
// If not, just verify the URL builders agree on both locales.
// ---------------------------------------------------------------------------
const distRoot = ['dist/client', 'dist'].map((p) => path.resolve(p)).find((p) => existsSync(p));

function urlToHtmlPath(url: string, root: string): string {
  // Normalise: "/medical-tests/hematology/" -> root + "/medical-tests/hematology/index.html"
  const rel = url.replace(/^\/+/, '').replace(/\/$/, '');
  return path.join(root, rel, 'index.html');
}

const pairs: Array<{ label: string; en: string; pl: string }> = [];
pairs.push({
  label: 'pillar: medical-tests',
  en: buildPillarURL('en', 'medical-tests'),
  pl: buildPillarURL('pl', 'medical-tests'),
});
for (const key of Object.keys(categoryMeta) as CategoryKey[]) {
  pairs.push({
    label: `category: ${key}`,
    en: buildCategoryURL('en', key),
    pl: buildCategoryURL('pl', key),
  });
}

for (const pair of pairs) {
  if (!pair.en || !pair.pl) {
    console.error(`[i18n] route pair "${pair.label}" missing URL (en="${pair.en}", pl="${pair.pl}")`);
    failed++;
    continue;
  }
  if (distRoot) {
    const enHtml = urlToHtmlPath(pair.en, distRoot);
    const plHtml = urlToHtmlPath(pair.pl, distRoot);
    if (!existsSync(enHtml)) {
      console.error(`[i18n] ${pair.label}: missing EN HTML at ${enHtml}`);
      failed++;
    }
    if (!existsSync(plHtml)) {
      console.error(`[i18n] ${pair.label}: missing PL HTML at ${plHtml}`);
      failed++;
    }
  }
}

if (failed > 0) {
  console.error(`i18n coverage FAILED: ${failed} missing item(s)`);
  process.exit(1);
}
console.log(
  `i18n coverage OK: ${enKeys.length} keys × ${locales.length} locales; ${pairs.length} EN↔PL route pair(s)` +
    (distRoot ? ` verified in ${path.relative(process.cwd(), distRoot)}/` : ' (URL-level only; no dist/ found)'),
);
