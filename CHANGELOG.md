# Changelog

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
