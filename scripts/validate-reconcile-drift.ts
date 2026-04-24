#!/usr/bin/env tsx
/**
 * Reconcile-drift soft gate.
 *
 * Re-runs the Excel importer; if anything under
 * src/content/medical-tests/ or content-sources/medical-tests-reconcile.xlsx
 * would change, prints a warning. Exits 0 (soft gate — never fails CI,
 * just surfaces drift).
 *
 * Safety: if the working tree already has uncommitted changes in the paths
 * we touch, the check is skipped — we won't clobber Blazej's in-progress work.
 */
import { execSync } from 'node:child_process';

const WATCH_PATHS = 'src/content/medical-tests/ content-sources/medical-tests-reconcile.xlsx';

function gitStatus(paths: string): string {
  return execSync(`git status --short ${paths}`, { encoding: 'utf8' }).trim();
}

try {
  const dirty = gitStatus(WATCH_PATHS);
  if (dirty.length > 0) {
    console.warn('⚠ Working tree has uncommitted changes in medical-tests content — skipping drift check:');
    console.warn(dirty);
    process.exit(0);
  }

  execSync('pnpm import:tests', { stdio: 'pipe' });
  const changed = gitStatus(WATCH_PATHS);

  if (changed.length === 0) {
    console.log('✓ No reconcile drift detected.');
    process.exit(0);
  }

  console.warn('⚠ Reconcile drift detected — importer produces different output than committed:\n');
  console.warn(changed);
  console.warn('\nThis is a soft gate — CI will not fail. Run `pnpm import:tests` locally and commit to clear.');
  // Reset the working tree so we don't leave uncommitted changes from the importer run.
  execSync(`git checkout -- ${WATCH_PATHS}`, { stdio: 'inherit' });
  process.exit(0);
} catch (err) {
  console.warn('⚠ Reconcile-drift check could not complete:', (err as Error).message);
  process.exit(0);
}
