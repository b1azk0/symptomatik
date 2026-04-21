# Changelog

## 2026-04-21 — T12+T13: Excel → MDX importer with slugify + full pipeline (S0)

- Installed `exceljs@4` as devDependency
- Created `scripts/import-medical-tests.ts` — full TypeScript CLI for Excel → MDX import
  - Exports `slugify()` (Polish diacritics, parens stripped, NFKD normalised)
  - Exports `Frontmatter` interface, `rowToFrontmatter()`, `renderMdx()`
  - EN-first canonical slug pre-pass; PL rows aligned by index
  - Idempotent: `extractExistingPublishedAt` preserves original `publishedAt` on re-runs
  - Validates loudly: metaTitle > 60 chars, metaDescription > 160 chars, missing H2 sections — throws with row + test name; `main()` catches per-row and warns+skips
  - Slug collisions in source data deduped with `-2`/`-3` suffix + warning
  - Row count mismatch between EN and PL sheets: warns and processes only aligned rows (PL sheet has 4 extra rows + last ~5 misaligned vs EN)
  - Supports `--excel`, `--locales`, `--out`, `--dry-run`, `--only <slug>` flags
- Created `tests/unit/slugify.test.ts` — 6 tests covering lowercase/hyphenate, parens, Polish diacritics, multi-space collapse, slashes, empty input
- Created `tests/unit/import-parse.test.ts` — 3 tests covering `rowToFrontmatter` (EN canonical frontmatter), metaTitle throw, `renderMdx` output format
- `pnpm import:tests --dry-run` → 174 planned files (EN + PL, with skips for data quality issues in Excel)
- Data quality findings in `content-sources/medical-tests.xlsx`: 3 duplicate test names in EN sheet (Lipoprotein(a), Homocysteine, PHQ-9); 4 metaDescription/metaTitle violations in EN; ~28 in PL; PL sheet has 4 extra rows + ordering drift at row ~100
- All 43 tests pass; `pnpm check` 0 errors 0 warnings

## 2026-04-21 — T4: Install shadcn/ui neutral preset + baseline Button (S0)

- Ran `shadcn@latest init --defaults -t astro` — detected Astro framework, Tailwind 4, and `@/*` alias automatically
- `components.json` created with `"baseColor": "neutral"`, `"cssVariables": true`, style `base-nova` (shadcn v4 default using Base UI primitives instead of Radix)
- `src/lib/utils.ts` created — exports `cn()` helper using `clsx` + `tailwind-merge`
- `src/components/ui/button.tsx` created — uses `@base-ui/react/button` primitive with `class-variance-authority` variants
- `src/styles/global.css` updated: shadcn appended `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `@import "@fontsource-variable/geist"`, `@custom-variant dark`, and full neutral CSS variables to `:root` + `.dark` blocks; our `@import 'tailwindcss'` preserved at line 1 and `@config '../../tailwind.config.ts'` preserved after imports; brand vars (`--color-brand-*`) preserved intact
- New runtime deps added: `@base-ui/react`, `@fontsource-variable/geist`, `class-variance-authority`, `clsx`, `lucide-react`, `shadcn`, `tailwind-merge`, `tw-animate-css`
- `src/pages/index.astro` updated with smoke-test Button (`client:load`)
- `pnpm build` exits 0; dev-server curl confirms `shadcn works` in rendered HTML

## 2026-04-21 — T3: Add React 18, Tailwind 4, MDX, Cloudflare adapter (S0)

- Installed `@astrojs/react`, `@astrojs/mdx`, `@astrojs/cloudflare`, `react@18`, `react-dom@18`, `tailwindcss@4`, `@tailwindcss/vite`, `@types/react@18`, `@types/react-dom@18`
- Upgraded Astro 5 → 6 (adapters `@astrojs/cloudflare@13` and `@astrojs/mdx@5` require Astro ^6; staying on 5 would have left us with unresolvable peer deps)
- **Astro 5/6 output-mode substitution**: `output: 'hybrid'` no longer exists; using `output: 'server'` + `export const prerender = true` per page (identical intent: SSG default, SSR available for future API routes)
- **wrangler.toml `pages_build_output_dir` removed**: wrangler v4 rejects the `ASSETS` binding (used internally by the CF adapter) in configs that have `pages_build_output_dir` set — that flag is a Cloudflare dashboard deployment setting, not needed locally; documented in comment
- Wired Tailwind 4 via `@tailwindcss/vite` Vite plugin; `src/styles/global.css` uses `@import 'tailwindcss'` (v4 CSS-first approach)
- Created `tailwind.config.ts` with content globs and custom font families
- Created `wrangler.toml` with name, compat date, `nodejs_compat` flag, `PUBLIC_SITE_URL` var
- Updated `src/pages/index.astro` with Tailwind utility classes; `pnpm build` and dev-server smoke tests pass

## 2026-04-21 — S0 implementation plan

- Wrote 40-task implementation plan for S0 at `docs/superpowers/plans/2026-04-21-symptomatik-s0-foundation-scaffold.md`
- Plan structured in 10 phases: scaffold, i18n infra, content pipeline, SEO utilities + core components, cookie consent, pages + routing, sitemap + robots, infra interfaces, CI quality gates, deploy + golden-path verification
- Each task is TDD-style (failing test → run → implement → run → commit) where applicable; config and visual tasks use smoke-check patterns
- Golden-path verification: 12-point checklist against production (or pages.dev fallback) before declaring S0 shipped

## 2026-04-21 — Host repo under b1azk0, not Digital-Savages org

- Moved GitHub hosting from `Digital-Savages/symptomatik` to `b1azk0/symptomatik`
- Repo now hosted under Blazej's personal GitHub account; business-entity ownership remains Digital Savages
- Origin remote updated to https://github.com/b1azk0/symptomatik.git
- Updated spec + README accordingly

## 2026-04-21 — Resolve spec open items: ownership, Excel source, domain

- GitHub ownership locked: `github.com/Digital-Savages/symptomatik` (Digital Savages org)
- Content source copied into repo at `content-sources/medical-tests.xlsx` (was user's Downloads); Excel → MDX generator now reads from in-repo source by default, making builds reproducible from any machine
- Domain: Blazej connecting `symptomatik.com` to his Cloudflare account; fallback is `*.pages.dev` subdomain until DNS settles
- Updated spec + README accordingly

## 2026-04-21 — Initial commit: S0 design spec

- Initialized repo
- Full project decomposition recorded: 10 sub-projects (S0–S9), each with its own spec → plan → implement cycle
- Added S0 Foundation Scaffold design spec at `docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md`
- Key architecture decisions:
  - Cloudflare Pages + Workers, with portability discipline (CF primitives behind `lib/infra/` interfaces so parts can migrate to Hetzner later)
  - Hybrid Astro mode (SSG default, on-demand routes ready for future `/api/` needs)
  - i18n with translated URL segments per locale, EN at root (no `/en/` prefix)
  - Frontmatter-driven content rendering from structured Excel source
  - MedicalWebPage (not MedicalTest) as root JSON-LD schema for content pages
- S0 "done" gate: both CBC EN and PL pages live, Lighthouse ≥ 90 SEO / ≥ 85 Perf, Google Rich Results validation clean, hreflang correct, CI green
