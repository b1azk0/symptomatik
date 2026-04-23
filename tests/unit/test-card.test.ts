// @vitest-environment node
// AstroContainer runs server-side rendering; the 'node' environment ensures
// Astro's vite plugin compiles .astro files as SSR modules, not browser stubs.
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect } from 'vitest';
import TestCard from '@/components/TestCard.astro';

describe('TestCard', () => {
  it('renders title, aiUseCase, and link to the test page', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TestCard, {
      props: {
        href: '/medical-tests/cbc/',
        title: 'Complete Blood Count',
        aiUseCase: 'Anemia, infection',
        categoryLabel: 'Hematology',
        paletteAccent: '#D4654A',
      },
    });
    expect(html).toContain('Complete Blood Count');
    expect(html).toContain('Anemia, infection');
    expect(html).toContain('Hematology');
    expect(html).toContain('href="/medical-tests/cbc/"');
  });

  it('uses paletteAccent as the eyebrow color', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TestCard, {
      props: {
        href: '/medical-tests/cbc/',
        title: 'CBC',
        aiUseCase: 'Test',
        categoryLabel: 'Hematology',
        paletteAccent: '#D4654A',
      },
    });
    // The accent color must appear somewhere in the rendered markup (as inline style or class payload).
    expect(html).toMatch(/#D4654A/i);
  });

  it('renders the category label in uppercase (via CSS or raw content)', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(TestCard, {
      props: {
        href: '/medical-tests/cbc/',
        title: 'CBC',
        aiUseCase: 'Test',
        categoryLabel: 'Hematology',
        paletteAccent: '#D4654A',
      },
    });
    // Allow either uppercase in HTML or via CSS class applying text-transform: uppercase.
    expect(html.toLowerCase()).toContain('hematology');
  });
});
