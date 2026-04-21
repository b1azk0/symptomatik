import { describe, it, expect } from 'vitest';
import { InMemoryFileStore } from '@/lib/infra/file-store';

describe('InMemoryFileStore', () => {
  it('put then get returns the data', async () => {
    const fs = new InMemoryFileStore();
    const data = new TextEncoder().encode('hello').buffer;
    await fs.put('k1', data);
    const got = await fs.get('k1');
    expect(got).not.toBeNull();
    expect(new TextDecoder().decode(got!)).toBe('hello');
  });

  it('get returns null for missing key', async () => {
    const fs = new InMemoryFileStore();
    expect(await fs.get('missing')).toBeNull();
  });

  it('delete removes the key', async () => {
    const fs = new InMemoryFileStore();
    await fs.put('k', new TextEncoder().encode('x').buffer);
    await fs.delete('k');
    expect(await fs.get('k')).toBeNull();
  });
});
