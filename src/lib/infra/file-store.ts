export interface FileStore {
  put(key: string, data: ArrayBuffer, opts?: { contentType?: string }): Promise<void>;
  get(key: string): Promise<ArrayBuffer | null>;
  delete(key: string): Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// In-memory impl (test double + local dev fallback)
// ─────────────────────────────────────────────────────────────────────

export class InMemoryFileStore implements FileStore {
  private store = new Map<string, ArrayBuffer>();

  async put(key: string, data: ArrayBuffer): Promise<void> {
    this.store.set(key, data);
  }
  async get(key: string): Promise<ArrayBuffer | null> {
    return this.store.get(key) ?? null;
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Cloudflare R2 impl — used when S8 premium features land
// ─────────────────────────────────────────────────────────────────────

interface R2BucketLike {
  put(
    key: string,
    data: ArrayBuffer,
    opts?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
}

export class CFR2FileStore implements FileStore {
  constructor(private readonly bucket: R2BucketLike) {}

  async put(key: string, data: ArrayBuffer, opts?: { contentType?: string }): Promise<void> {
    await this.bucket.put(
      key,
      data,
      opts?.contentType ? { httpMetadata: { contentType: opts.contentType } } : undefined,
    );
  }
  async get(key: string): Promise<ArrayBuffer | null> {
    const obj = await this.bucket.get(key);
    if (!obj) return null;
    return obj.arrayBuffer();
  }
  async delete(key: string): Promise<void> {
    await this.bucket.delete(key);
  }
}
