import { describe, it, expect } from 'vitest';
import { medicalWebPage, breadcrumbList, webSite } from '@/lib/seo/json-ld';

describe('medicalWebPage', () => {
  it('emits @type=MedicalWebPage with core fields', () => {
    const ld = medicalWebPage({
      url: 'https://symptomatik.com/medical-tests/cbc/',
      title: 'CBC: Normal Ranges',
      description: 'Interpret CBC results.',
      lastReviewed: new Date('2026-04-21'),
      inLanguage: 'en',
    });
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('MedicalWebPage');
    expect(ld['url']).toBe('https://symptomatik.com/medical-tests/cbc/');
    expect(ld['name']).toBe('CBC: Normal Ranges');
    expect(ld['lastReviewed']).toBe('2026-04-21');
    expect(ld['inLanguage']).toBe('en');
  });

  it('includes datePublished when provided', () => {
    const ld = medicalWebPage({
      url: 'https://symptomatik.com/x/',
      title: 't',
      description: 'd',
      lastReviewed: new Date('2026-04-21'),
      datePublished: new Date('2026-01-15'),
      inLanguage: 'en',
    });
    expect(ld['datePublished']).toBe('2026-01-15');
  });

  it('omits author when not provided', () => {
    const ld = medicalWebPage({
      url: 'https://symptomatik.com/x/',
      title: 't',
      description: 'd',
      lastReviewed: new Date(),
      inLanguage: 'en',
    });
    expect((ld as any).author).toBeUndefined();
  });
});

describe('breadcrumbList', () => {
  it('numbers positions from 1', () => {
    const ld = breadcrumbList([
      { label: 'Home', href: 'https://symptomatik.com/' },
      { label: 'Medical Tests', href: 'https://symptomatik.com/medical-tests/' },
      { label: 'CBC' },
    ]);
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement).toHaveLength(3);
    expect(ld.itemListElement[0]).toMatchObject({ '@type': 'ListItem', position: 1, name: 'Home' });
    expect(ld.itemListElement[2]).toMatchObject({ position: 3, name: 'CBC' });
  });

  it('leaf item without href omits the item field', () => {
    const ld = breadcrumbList([{ label: 'Home', href: 'https://symptomatik.com/' }, { label: 'Leaf' }]);
    const leaf = ld.itemListElement[1]!;
    expect((leaf as any).item).toBeUndefined();
  });
});

describe('webSite', () => {
  it('emits WebSite schema with name and url', () => {
    const ld = webSite({ site: 'https://symptomatik.com', name: 'Symptomatik', inLanguage: 'en' });
    expect(ld['@type']).toBe('WebSite');
    expect(ld['url']).toBe('https://symptomatik.com');
    expect(ld['name']).toBe('Symptomatik');
    expect(ld['inLanguage']).toBe('en');
  });
});
