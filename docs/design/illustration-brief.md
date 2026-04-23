# Symptomatik — Illustration Style Brief

**Locked:** 2026-04-23 (S1 Content Platform, approved direction after Pencil exploration)
**Reference visual:** `docs/design/s1-content-platform.pen` → "Pillar Page / Option C × patient.info" frame

## Why this brief exists

Symptomatik uses illustrations as the primary card-level visual on pillar and category landing pages, mirroring patient.info's card-forward information architecture — but replacing patient.info's generic stock photography with a consistent custom illustration set that scales across hundreds of cards over S1–S9.

Every illustration that ships on the site must feel like a sibling of every other. This brief is the gate: if a new illustration violates any of the rules below, it doesn't ship until it's fixed.

## Visual vocabulary

| Dimension | Direction |
|---|---|
| **Voice** | Editorial · clinical-with-warmth · anatomical-suggestive (not literal) |
| **Form** | Soft organic shapes · rounded curves · minimal angular geometry |
| **Composition** | Asymmetric · 1–3 major shapes overlapping · clear focal point |
| **Rendering** | Flat vector · no gradients beyond subtle tonal variation · no photorealism |
| **Background** | Cream / warm off-white (`#FEF7F2` or lighter category fill) · always spacious |
| **Detail level** | Minimalist · no filigree · no text · no human faces |
| **Mood** | Quiet · trustworthy · contemplative · never "bright energetic tech" |
| **Inspiration** | Stripe Press illustrations × 1930s scientific diagrams × patient.info density |

## Per-category color palette

Each category owns a 4-color range encoded in `src/i18n/categories.ts` (extended with illustration palette in a later task). Illustrations stay inside their category's palette; cross-category visual grouping emerges from palette alone, no captions needed.

| Category key | Palette family | Light fill | Medium shape | Dark accent |
|---|---|---|---|---|
| hematology | Peach / terracotta | `#FDE7D6` | `#F4A584` | `#D4654A` / `#8B3A20` |
| cardiometabolic | Coral / salmon | `#FDEAE0` | `#F4A58A` | `#C75040` |
| gastro | Cream / ochre | `#F5EDE0` | `#D8B874` | `#8B6020` |
| heart | Pink / rose | `#FCE4E4` | `#E8A8A8` | `#A0404A` |
| hematology (dup — keep one) | — | — | — | — |
| hormonal | Mauve / plum | `#EFE5EC` | `#D4BAC8` | `#8B5A75` |
| inflammatory | Coral / red | `#FDEAE0` | `#F4A58A` | `#C75040` |
| liver | Amber / mustard | `#F5EDE0` | `#E8C984` | `#B08944` / `#6B4F20` |
| mental-health | Warm gray / sand | `#F0E4D8` | `#D4C9BB` | `#8B7B65` / `#6B5A47` |
| metabolism | Olive / moss | `#EEEEDC` | `#C5C98A` | `#6B7040` |
| oncology | Lilac / violet | `#ECE5F0` | `#C5B5D4` | `#6A5485` |
| urine | Sage / teal-gray | `#E6ECE8` | `#B5C6BD` | `#4A6F5C` |

Text + pill accents within each palette derive from the dark-accent shade at 80% saturation. Page background is always warm linen `#FEF7F2`.

## Master prompt template (AI generation)

```
Flat pastel editorial illustration with a composed field of overlapping
organic shapes, featuring [RECOGNIZABLE SUBJECT] as the clear focal element,
embedded within ambient secondary organic forms in complementary pastel tones
filling the entire composition, flat solid color fields only,
no texture, no shading, no gradient, no isolated icon feel,
[PALETTE DESCRIPTION], organic rounded shapes with editorial density,
cream white background, matches the compositional fullness of the
red blood cells and liver silhouette illustrations.
```

**Three tensions this template holds against AI drift (2026-04-23 learnings):**

1. **Flat, not textured.** `SOLID FLAT COLOR FIELDS ONLY, no texture, no shading, no gradient, no realistic rendering` — without this, abstract subjects (metabolic leaves, mental-health mist, tumor-marker crystals) drift into painterly or botanical-realistic rendering.

2. **Recognizable subject, not abstract.** `RECOGNIZABLE [subject] as the clear focal element` — a card illustration that can't be identified as its category defeats the card's navigation purpose. Use concrete anatomical or lab-adjacent subjects (kidneys for metabolic panel, specimen cup for urinalysis, marked cell cluster for tumor markers, profile + brain for mental health). Avoid pure abstractions.

3. **Compositional density, not iconic isolation.** `composed field of overlapping organic shapes... ambient secondary organic forms filling the entire composition... no isolated icon feel... editorial density` — without this, the generator produces "icon on white background" compositions that read as app icons, not editorial illustrations. The winners (Hematology, Liver, Inflammatory) have multiple organic shapes in the same palette filling the frame, with the subject embedded in an ambient field.

All three constraints must be active simultaneously. Dropping any one causes a recognizable failure mode.

**Reference-anchoring to known-good outputs** ("matches the compositional fullness of the red blood cells and liver silhouette illustrations") further corrects drift and is especially load-bearing for regenerations after prompt tuning.

Suggested generator: **Flux Pro 1.1** or **Recraft v3** for vector-leaning output. Midjourney v6 works but requires heavier prompt guardrails against its default maximalism. Avoid DALL-E for this style (tendency toward illustrated-icon aesthetic that breaks register).

## Subject library — locked after 2026-04-23 Pencil iteration

Each subject paired with exact prompt — these subjects are what shipped after iteration against Blazej. When regenerating or adding new pillar categories, use a concrete recognizable anatomical/lab subject, not a pure abstraction.

| Key | Subject | Why this subject |
|---|---|---|
| `hematology` | stylized red blood cells and platelets in a microscopic field | Archetypal "what's in your blood" visual |
| `hormonal` | stylized endocrine balance motif with interconnected organic shapes | Abstract-but-readable as "harmony/balance" |
| `inflammatory` | stylized abstract inflammation motif with soft radial warmth glow | "Warmth" visual directly encodes inflammation |
| `liver` | stylized anatomical liver silhouette with soft circulation flow lines | Recognizable organ silhouette |
| `mental-health` | clear human head silhouette in profile with a soft simplified brain shape visible inside | Iteration learning: "abstract thought waves" (first attempt) wasn't recognizable as the category; profile + brain is immediately readable |
| `metabolism` | pair of stylized anatomical kidney silhouettes | Iteration learning: "metabolic energy flow" was too abstract; metabolic panel is heavily kidney-focused (BUN, creatinine, eGFR) so paired kidneys is semantically correct and anatomically recognizable |
| `oncology` | stylized magnifying lens hovering over a small cluster of pastel cells, with one cell underneath the lens highlighted in a darker tone | Iteration learning: plain "marked cell cluster" overlapped visually with Hematology; the magnifying lens adds the "detection/screening" narrative that distinguishes tumor markers as a test category |
| `urine` | single laboratory specimen collection cup filled with soft pale yellow liquid | Iteration learning: "water droplet with ripples" was too abstract; specimen cup unambiguously signals urinalysis as a test |
| **Not yet generated for S1** | | |
| `cardiometabolic` | stylized heart silhouette intersecting soft energy flow lines | Reserve for when cardiometabolic category has live tests to render |
| `gastro` | stylized digestive tract silhouette with soft flowing curves | Reserve |
| `heart` | stylized anatomical heart silhouette with gentle pulse wave motif | Reserve |
| `autoimmunology` | stylized abstract shield or protective cluster motif | Reserve |

## Pillar hero (1 per pillar)

Higher-scale version of the pillar's most emblematic category illustration. For medical-tests:

> Hero editorial medical illustration representing comprehensive lab health testing, stylized abstract microscopic composition with red blood cells and soft anatomical motifs, organic rounded shapes, flat vector style, warm peach and terracotta palette with cream highlights, large centered composition, gentle and trustworthy mood, no text, patient.info meets Stripe Press aesthetic.

## Do / Don't

**DO:**
- Single, clear subject per illustration — card viewer should read it in < 1 second
- Soft edges, organic curves, asymmetric composition
- Stay inside the category's 4-color palette — no rainbow fills
- Leave 20–30% of the canvas as warm cream background
- Render at 2× retina (minimum 1200×800 for hero, 600×600 for category cards)
- Export as WebP for web · keep SVG source when generator allows (Recraft)

**DON'T:**
- No text, no labels, no annotation marks (those live in the HTML, never baked into the image)
- No human faces, no medical staff, no patient imagery
- No stock-photo aesthetic (realistic skin, hospital rooms, test tubes under fluorescent light)
- No 3D / isometric / perspective drawing — stay flat
- No hard drop shadows on the illustration itself (elevation lives on the card frame)
- No cool/technology palettes (bright blue, cyan, magenta) — we are warm-health, not cold-tech
- No icon-like mascots or characters — the illustration is abstract-anatomical, not figurative

## File layout in the repo

```
src/assets/illustrations/
  pillar/
    medical-tests.webp
    medical-tests.svg            # source if available
  category/
    hematology.webp
    cardiometabolic.webp
    gastro.webp
    heart.webp
    hormonal.webp
    inflammatory.webp
    liver.webp
    mental-health.webp
    metabolism.webp
    oncology.webp
    urine.webp
```

Each file SVGO-optimized (SVG) or compressed to ≤ 40KB (WebP) before commit. Enforced by a CI size gate.

## Schema change for `categoryMeta`

When illustrations land, extend `src/i18n/categories.ts`:

```ts
'hematology': {
  en: { slug: 'hematology', label: 'Hematology' },
  pl: { slug: 'hematologia', label: 'Hematologia' },
  illustration: '/assets/illustrations/category/hematology.webp',
  paletteAccent: '#D4654A',
},
```

Alt-text is page-template-generated (`Illustration of ${label}`), never hardcoded in frontmatter — keeps the image set locale-independent.

## Growth over S2–S9

- **S2 AI router:** no new illustrations needed.
- **S3 Lab Results Interpreter:** one hero illustration for the app page.
- **S4 Symptom Checker:** one hero + maybe 5–8 body-system illustrations for its own pillar.
- **S5 Mental Health Assessments:** inherit mental-health palette; add 1 hero + per-instrument is optional.
- **S6 Health Calculators:** 1 hero + minimal per-calculator icons.
- **S9 Content pillars at scale:** if a new pillar adds > 10 categories, generate a matching set — always in one session, same prompt template, same generator model, same seed-close palette.

**Rule:** never generate illustrations one at a time across months. Model drift + prompt drift = inconsistent style. Batch-generate each set in a single session.

## Versioning

First illustrations generated in Pencil MCP on 2026-04-23 using `G("frame-id", "ai", prompt)`. When moved to the repo, tag the set as `illustration-set-v1`. A future restyling would generate `v2` wholesale, never mix versions in production.
