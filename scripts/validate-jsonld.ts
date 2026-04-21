#!/usr/bin/env tsx
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const DIST_CANDIDATES = [
  path.resolve('dist/client'),   // Cloudflare adapter output
  path.resolve('dist'),          // fallback
];

const REQUIRED_BY_TYPE: Record<string, string[]> = {
  MedicalWebPage: ['@context', '@type', 'url', 'name', 'description', 'inLanguage', 'lastReviewed'],
  BreadcrumbList: ['@context', '@type', 'itemListElement'],
  WebSite: ['@context', '@type', 'url', 'name', 'inLanguage'],
};

async function* walk(dir: string): AsyncGenerator<string> {
  for (const d of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      yield* walk(p);
    } else if (p.endsWith('.html')) {
      yield p;
    }
  }
}

function extractJsonLd(html: string, file: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script\s+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1] ?? '';
    try {
      blocks.push(JSON.parse(raw));
    } catch (e) {
      throw new Error(`Malformed JSON-LD in ${file}: ${(e as Error).message}\n${raw}`);
    }
  }
  return blocks;
}

async function main(): Promise<void> {
  const root = DIST_CANDIDATES.find((p) => existsSync(p));
  if (!root) {
    console.error(`No dist directory found. Looked for: ${DIST_CANDIDATES.join(', ')}. Run \`pnpm build\` first.`);
    process.exit(1);
  }
  const rootStat = await stat(root);
  if (!rootStat.isDirectory()) {
    console.error(`${root} is not a directory`);
    process.exit(1);
  }

  let failed = 0;
  let validated = 0;
  for await (const file of walk(root)) {
    const html = await readFile(file, 'utf8');
    const blocks = extractJsonLd(html, file);
    for (const block of blocks) {
      validated++;
      const b = block as Record<string, unknown>;
      const type = b['@type'] as string | undefined;
      if (!type) {
        console.error(`[${file}] JSON-LD missing @type`);
        failed++;
        continue;
      }
      const required = REQUIRED_BY_TYPE[type];
      if (!required) continue;
      for (const k of required) {
        if (b[k] === undefined) {
          console.error(`[${file}] ${type} missing required field "${k}"`);
          failed++;
        }
      }
    }
  }
  console.log(`validated ${validated} JSON-LD blocks from ${root}; ${failed} failure(s)`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
