#!/usr/bin/env tsx
import { ui } from '../src/i18n/ui.ts';
import { locales } from '../src/i18n/locales.ts';

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
if (failed > 0) {
  console.error(`i18n coverage FAILED: ${failed} missing key(s)`);
  process.exit(1);
}
console.log(`i18n coverage OK: ${enKeys.length} keys × ${locales.length} locales`);
