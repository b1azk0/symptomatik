// Ambient type declaration for .astro component imports in unit tests.
// TSC does not run the Astro TS plugin when type-checking test files directly,
// so this stub gives imported .astro files a safe fallback type.
// The actual component types are enforced by `astro check`.
declare module '*.astro' {
  import type { AstroComponentFactory } from 'astro/types';
  const component: AstroComponentFactory;
  export default component;
}
