interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

interface BlockData {
  number: number;
  timestamp: number;
  [key: string]: any;
}

class LRUCache<K, V> {
  private cache: Map<string, CacheEntry<V>>;
  private maxSize: number;
  private ttlSeconds: number;

  constructor(maxSize: number, ttlSeconds: number = 60) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlSeconds = ttlSeconds;
  }

  private serializeKey(key: K): string {
    return JSON.stringify(key);
  }

  get(key: K): V | undefined {
    const serializedKey = this.serializeKey(key);
    const entry = this.cache.get(serializedKey);

    if (!entry) {
      return undefined;
    }

    const now = Date.now() / 1000;
    if (now - entry.timestamp > this.ttlSeconds) {
      this.cache.delete(serializedKey);
      return undefined;
    }

    this.cache.delete(serializedKey);
    this.cache.set(serializedKey, entry);

    return entry.value;
  }

  set(key: K, value: V): void {
    const serializedKey = this.serializeKey(key);

    if (this.cache.has(serializedKey)) {
      this.cache.delete(serializedKey);
    }

    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(serializedKey, {
      value,
      timestamp: Date.now() / 1000
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

interface BlockNumberCacheKey {
  chain: string;
  height: number | string;
}

export class BlockCache {
  private blockNumberCache: LRUCache<BlockNumberCacheKey, BlockData>;

  private latestBlockCache: LRUCache<string, BlockData>;

  constructor() {
    this.blockNumberCache = new LRUCache<BlockNumberCacheKey, BlockData>(100, 300);

    this.latestBlockCache = new LRUCache<string, BlockData>(100, 10);
  }

  getBlock(chain: string, height: number | string): BlockData | undefined {
    if (height === "latest") {
      return this.latestBlockCache.get(chain);
    }

    return this.blockNumberCache.get({ chain, height });
  }

  setBlock(chain: string, height: number | string, blockData: BlockData): void {
    if (height === "latest") {
      this.latestBlockCache.set(chain, blockData);
    } else {
      this.blockNumberCache.set({ chain, height }, blockData);
    }
  }

  clearAll(): void {
    this.blockNumberCache.clear();
    this.latestBlockCache.clear();
  }

  getStats(): { blockNumberCacheSize: number; latestBlockCacheSize: number } {
    return {
      blockNumberCacheSize: this.blockNumberCache.size(),
      latestBlockCacheSize: this.latestBlockCache.size()
    };
  }
}

export const blockCache = new BlockCache();
