// EN ↔ PL test name aliases for canonical-slug pairing.
//
// The import pipeline processes EN and PL sheets independently — each row
// generates its own MDX file at its own slug. Cross-locale linking is
// expressed via `canonicalSlug`: paired pages share the same canonical
// (always derived from the EN side). When EN and PL test names slugify to
// the same value (PHQ-9 / PHQ-9, AUDIT / AUDIT, DHEA-S / DHEA-S) no alias
// is needed — the slugs match naturally. This map is for cognate pairs
// where the names differ enough that slugs diverge (Calcium / Wapń,
// Cortisol / Kortyzol, ESR / OB, etc.).
//
// Tests with no counterpart in the other source sheet stay out of this map
// and become single-locale pages with `canonicalSlug = self`. Phase 2
// translations will fill those gaps; this map can grow without code changes.

export const EN_TO_PL_TEST_ALIAS: Record<string, string> = {
  // Hematology
  'Complete Blood Count (CBC)': 'Morfologia krwi (CBC)',
  'Ferritin': 'Ferrytyna',
  'Iron Panel': 'Panel żelaza',

  // Metabolism
  'Comprehensive Metabolic Panel (CMP)': 'Panel metaboliczny (CMP)',
  'Basic Metabolic Panel (BMP)': 'Podstawowy panel metaboliczny (BMP)',
  'HbA1c (Glycated Hemoglobin)': 'HbA1c',
  'Fasting Glucose': 'Glukoza na czczo',
  'Insulin': 'Insulina',
  'Vitamin B12': 'Witamina B12',
  'Folic Acid': 'Kwas foliowy',
  'Vitamin D': 'Witamina D',
  'Uric Acid': 'Kwas moczowy',
  'Electrolytes': 'Elektrolity',
  'Calcium': 'Wapń',
  'Magnesium': 'Magnez',
  'Phosphorus': 'Fosfor',

  // Cardiometabolic
  'Lipid Profile': 'Profil lipidowy',
  'Lipoprotein(a) - Cardiovascular Risk': 'Lp(a) / Lipoprotein(a)',
  'Homocysteine': 'Homocysteina',
  'ApoA1/ApoB Ratio': 'ApoA1/ApoB',

  // Hormonal
  'TSH (Thyroid Stimulating Hormone)': 'TSH',
  'T4 (Thyroxine)': 'fT4',
  'Reverse T3 (Triiodothyronine)': 'Reverse T3',
  'Cortisol': 'Kortyzol',
  'Testosterone': 'Testosteron',
  'Prolactin': 'Prolaktyna',

  // Inflammatory
  'ESR': 'OB',

  // Gastro
  'Calprotectin Test': 'Kalprotektyna',
  'Helicobacter pylori Test': 'Helicobacter pylori',
  'Fecal Elastase': 'Elastaza w kale',
  'Occult Blood Test': 'Test na krew utajoną w kale',
  'Zonulin': 'Zonulina',

  // Urine
  'Urinalysis with Microscopy': 'Badanie moczu z mikroskopią',
  'Basic Urine Test': 'Badanie moczu (podstawowe)',
  'Urine Sediment Test': 'Osad moczu',

  // Coagulation
  'Fibrinogen': 'Fibrynogen',

  // Infections (cultures)
  'Urine Culture': 'Posiew moczu',
  'Blood Culture': 'Posiew krwi',
  'Stool Culture': 'Posiew kału',
  'Throat Culture': 'Posiew gardła',

  // Oncology
  'PSA Test': 'PSA',
  'CEA Test': 'CEA',
  'AFP Test': 'AFP',
  'CA-125 Tumor Marker': 'CA-125',
  'CA 19-9 Tumor Marker': 'CA 19-9',

  // Autoimmunology
  'ANA Test': 'ANA',
  'RF Test': 'RF',
  'Anti-TPO Antibodies': 'Anty-TPO',
  'Anti-Thyroglobulin Antibodies': 'Anty-TG',

  // Immunology
  'Specific IgE Antibodies': 'IgE swoiste',

  // Coagulation / Liver — same test, different naming convention
  'Prothrombin Time (PT)': 'PT/INR',
  'Bilirubin': 'Bilirubina (z CMP)',
};

// EN test names that duplicate another EN row's content (different slug, same
// underlying test). The import skips them so they don't produce single-locale
// MDX with no real PL counterpart. These are data-quality artifacts in the
// source xlsx (separate row entries for the same test) — the canonical EN
// row for each concept is the one already paired in EN_TO_PL_TEST_ALIAS.
export const EN_KNOWN_DUPLICATE_NAMES = new Set<string>([
  'C-Reactive Protein (CRP)',                    // dup of row "CRP" (paired)
  'Thyroid Stimulating Hormone (TSH)',           // dup of "TSH (Thyroid Stimulating Hormone)"
  'DASS-21 (Depression Anxiety Stress Scale)',   // dup of "...Scales" plural variant (paired)
  'Lipoprotein(a)',                              // dup of "Lipoprotein(a) - Cardiovascular Risk"
]);

// Reverse lookup table built once.
export const PL_TO_EN_TEST_ALIAS: Record<string, string> = Object.fromEntries(
  Object.entries(EN_TO_PL_TEST_ALIAS).map(([en, pl]) => [pl, en]),
);
