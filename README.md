# Symptomatik.com

Multilingual (EN/ES/PL) health platform: lab results interpretation, symptom checker, mental health self-assessments, and health calculators. Freemium with Premium subscription.

**Status:** Design phase — S0 Foundation Scaffold spec written, awaiting implementation plan.

## Decomposition

The full platform is being built as 10 sub-projects (S0–S9), each with its own design spec → implementation plan → execution cycle.

| # | Sub-project | Status |
|---|---|---|
| **S0** | **Foundation Scaffold** | **Spec drafted** — [docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md](docs/superpowers/specs/2026-04-21-symptomatik-s0-foundation-scaffold-design.md) |
| S1 | Content platform — medical-tests pillar (102 tests × EN+PL) | Not started |
| S2 | AI routing layer (multi-LLM router) | Not started |
| S3 | App: Lab Results Interpreter (free tier) | Not started |
| S4 | App: Symptom Checker (free tier) | Not started |
| S5 | App: Mental Health Assessments (22 validated instruments) | Not started |
| S6 | App: Health Calculators | Not started |
| S7 | Auth + Billing (Clerk/Auth.js + Stripe + Supabase) | Not started |
| S8 | Premium features (PDF/OCR upload, image analysis, digital consultation) | Not started |
| S9 | Content pillars at scale (symptoms, diseases, medicines, supplements, etc.) | Not started |

## Planned Stack

- Astro 5 + React 18 islands
- Tailwind 4 + shadcn/ui
- Cloudflare Pages + Workers (with portability discipline — KV/R2 behind `lib/infra/` interfaces so we can migrate parts to Hetzner later)
- TypeScript strict mode
- Content: Astro Content Collections + MDX, Zod schemas
- CI: GitHub Actions (typecheck, build, Lighthouse ≥ 90 SEO, axe a11y, link check, JSON-LD validation, i18n coverage)

Full detail in the S0 design spec.

## Sources

- **Source spec:** `Symptomatik_-_Website_Agent_Spec_v1.pdf` (user's Downloads folder)
- **Content source:** Excel with 102 medical test landing pages in EN + PL (`Final Symptomatik_-_Core_LPs_English+Polish.xlsx`)
- **ES content:** Not yet produced; routing scaffolded, content comes via LLM-assisted translation later

## Related

- [ClaudioBrain](../ClaudioBrain/) — cross-repo context, project registry, conventions
- [blazejmrozinski.com](../blazejmrozinski.com/) — sibling Astro + Cloudflare project, reference patterns
