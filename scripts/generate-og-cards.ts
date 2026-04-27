#!/usr/bin/env tsx
/**
 * OG card generator. Walks page-type registry, renders one PNG per LP via
 * satori (HTML/CSS → SVG) + resvg-js (SVG → PNG). Writes to public/og/.
 *
 * Pass --force to regenerate every PNG; default uses scripts/.og-cache.json
 * to skip unchanged inputs.
 *
 * Run order in `prebuild`: import:tests → generate:og → astro build.
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { collectAllCards, type OGCardData } from '../src/lib/og/page-types';
import { buildCardElement } from '../src/lib/og/template';

const ROOT = new URL('..', import.meta.url).pathname;
const PUBLIC_DIR = join(ROOT, 'public');
const OG_DIR = join(PUBLIC_DIR, 'og');
const CACHE_FILE = join(ROOT, 'scripts', '.og-cache.json');
const TEMPLATE_VERSION = 'v1'; // bump when template changes

// satori requires WOFF v1 or raw OT/TT — WOFF2 is not supported
const FRAUNCES_600 = readFileSync(join(ROOT, 'node_modules/@fontsource/fraunces/files/fraunces-latin-600-normal.woff'));
const GEIST_500 = readFileSync(join(ROOT, 'node_modules/@fontsource/geist/files/geist-latin-500-normal.woff'));

const WIDTH = 1200;
const HEIGHT = 630;

interface CacheIndex { [outputPath: string]: string; }

function loadCache(): CacheIndex {
  if (!existsSync(CACHE_FILE)) return {};
  try { return JSON.parse(readFileSync(CACHE_FILE, 'utf-8')); }
  catch { return {}; }
}

function saveCache(cache: CacheIndex): void {
  writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function hashCard(card: OGCardData, illustrationBytes: Buffer): string {
  const h = createHash('sha256');
  h.update(TEMPLATE_VERSION);
  h.update(card.title);
  h.update(card.pillLabel);
  h.update(card.accent);
  h.update(card.illustration);
  h.update(illustrationBytes);
  return h.digest('hex');
}

// Display width of the illustration panel in the card template (~58% of 1200 = 720px)
const ILLO_DISPLAY_W = 720;
const ILLO_DISPLAY_H = HEIGHT; // full height bleed

async function renderCard(card: OGCardData): Promise<{ png: Buffer; hash: string }> {
  const illustrationFsPath = join(PUBLIC_DIR, card.illustration);
  if (!existsSync(illustrationFsPath)) {
    throw new Error(`Missing illustration for ${card.outputPath}: ${illustrationFsPath}`);
  }
  const illustrationBytes = readFileSync(illustrationFsPath);

  // satori supports SVG, PNG, and JPEG — but NOT WebP.
  // For WebP: resize to the display panel size and convert to JPEG (lossy) so the
  // embedded data URI stays small and the final PNG compresses well.
  let illustrationDataUri: string;
  if (card.illustration.endsWith('.webp')) {
    const jpegBytes = await sharp(illustrationBytes)
      .resize(ILLO_DISPLAY_W, ILLO_DISPLAY_H, { fit: 'cover' })
      .jpeg({ quality: 82 })
      .toBuffer();
    illustrationDataUri = `data:image/jpeg;base64,${jpegBytes.toString('base64')}`;
  } else if (card.illustration.endsWith('.svg')) {
    illustrationDataUri = `data:image/svg+xml;base64,${illustrationBytes.toString('base64')}`;
  } else {
    illustrationDataUri = `data:image/png;base64,${illustrationBytes.toString('base64')}`;
  }

  const element = buildCardElement(card, illustrationDataUri);

  const svg = await satori(element as any, {
    width: WIDTH,
    height: HEIGHT,
    fonts: [
      { name: 'Fraunces', data: FRAUNCES_600, weight: 600, style: 'normal' as const },
      { name: 'Geist',    data: GEIST_500,    weight: 500, style: 'normal' as const },
    ],
  });

  // Resvg renders to raw RGBA bitmap; recompress with sharp palette-PNG for size budget.
  // palette: true (256-colour quantisation) keeps OG PNGs well under 80 KB each.
  const rawPng = resvg_render(svg);
  const png = await sharp(rawPng)
    .png({ palette: true, quality: 75, compressionLevel: 9 })
    .toBuffer();
  const hash = hashCard(card, illustrationBytes);
  return { png, hash };
}

function resvg_render(svg: string): Buffer {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } });
  return Buffer.from(resvg.render().asPng());
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  mkdirSync(OG_DIR, { recursive: true });

  const cards = await collectAllCards();
  console.log(`[generate-og-cards] ${cards.length} cards to consider${force ? ' (--force)' : ''}`);

  const cache = force ? {} : loadCache();
  let generated = 0;
  let skipped = 0;
  let failures = 0;

  for (const card of cards) {
    const outFs = join(OG_DIR, card.outputPath);
    try {
      // Compute new hash without rendering
      const illustrationFsPath = join(PUBLIC_DIR, card.illustration);
      if (!existsSync(illustrationFsPath)) {
        console.error(`  ✗ ${card.outputPath} — missing illustration ${illustrationFsPath}`);
        failures++;
        continue;
      }
      const illustrationBytes = readFileSync(illustrationFsPath);
      const newHash = hashCard(card, illustrationBytes);

      if (!force && cache[card.outputPath] === newHash && existsSync(outFs)) {
        skipped++;
        continue;
      }

      const { png } = await renderCard(card);
      mkdirSync(dirname(outFs), { recursive: true });
      writeFileSync(outFs, png);
      cache[card.outputPath] = newHash;
      generated++;
      if (generated % 25 === 0) console.log(`  … ${generated} generated`);
    } catch (err) {
      console.error(`  ✗ ${card.outputPath}: ${(err as Error).message}`);
      failures++;
    }
  }

  saveCache(cache);
  console.log(`[generate-og-cards] done — generated ${generated}, skipped ${skipped}, failed ${failures}`);
  if (failures > 0) process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
