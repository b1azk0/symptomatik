/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly PUBLIC_GA4_ID: string;
  readonly PUBLIC_CF_ANALYTICS_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    locale: 'en' | 'pl' | 'es';
  }
}
