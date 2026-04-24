// @vitest-environment node
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, it, expect } from 'vitest';
import CategoryCard from '@/components/CategoryCard.astro';

describe('CategoryCard', () => {
  it('renders label, test count preview, href, and illustration', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryCard, {
      props: {
        href: '/medical-tests/hematology/',
        label: 'Hematology',
        testCount: 12,
        locale: 'en',
        testPreview: 'CBC, iron panel, clotting factors',
        illustration: '/assets/illustrations/category/hematology.webp',
        illustrationBg: '#FDE7D6',
        paletteAccent: '#D4654A',
      },
    });
    expect(html).toContain('Hematology');
    expect(html).toContain('12 tests');
    expect(html).toContain('CBC, iron panel, clotting factors');
    expect(html).toContain('href="/medical-tests/hematology/"');
    expect(html).toContain('/assets/illustrations/category/hematology.webp');
  });

  it('omits the <img> tag when illustration is not provided', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryCard, {
      props: {
        href: '/medical-tests/heart-tests/',
        label: 'Heart Tests',
        testCount: 0,
        locale: 'en',
        paletteAccent: '#A0404A',
      },
    });
    expect(html).toContain('Heart Tests');
    expect(html).not.toMatch(/<img\b/);
  });

  it('handles singular "1 test" vs plural', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryCard, {
      props: {
        href: '/medical-tests/urinalysis/',
        label: 'Urinalysis',
        testCount: 1,
        locale: 'en',
        paletteAccent: '#4A6F5C',
      },
    });
    expect(html).toContain('1 test');
    expect(html).not.toMatch(/1 tests/);
  });

  it('uses PL pluralization when locale=pl', async () => {
    const container = await AstroContainer.create();
    const ht1 = await container.renderToString(CategoryCard, {
      props: { href: '/pl/', label: 'Hematologia', testCount: 1, locale: 'pl', paletteAccent: '#D4654A' },
    });
    expect(ht1).toContain('1 badanie');

    const ht3 = await container.renderToString(CategoryCard, {
      props: { href: '/pl/', label: 'Hematologia', testCount: 3, locale: 'pl', paletteAccent: '#D4654A' },
    });
    expect(ht3).toContain('3 badania');

    const ht9 = await container.renderToString(CategoryCard, {
      props: { href: '/pl/', label: 'Hematologia', testCount: 9, locale: 'pl', paletteAccent: '#D4654A' },
    });
    expect(ht9).toContain('9 badań');
  });

  it('applies illustrationBg as the illustration zone background', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CategoryCard, {
      props: {
        href: '/medical-tests/hematology/',
        label: 'Hematology',
        testCount: 12,
        locale: 'en',
        illustrationBg: '#FDE7D6',
        paletteAccent: '#D4654A',
      },
    });
    expect(html).toMatch(/#FDE7D6/i);
  });
});
