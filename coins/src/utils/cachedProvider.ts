import { blockCache } from "./cache/blockCache";

interface BlockData {
  number: number;
  timestamp: number;
  [key: string]: any;
}

interface Provider {
  getBlock(height: number | "latest"): Promise<BlockData>;
  rpcs?: any[];
  [key: string]: any;
}

export class CachedProvider implements Provider {
  private provider: Provider;
  private chain: string;
  public rpcs?: any[];

  constructor(provider: Provider, chain: string) {
    this.provider = provider;
    this.chain = chain;
    this.rpcs = provider.rpcs;
  }

  async getBlock(height: number | "latest"): Promise<BlockData> {
    const cached = blockCache.getBlock(this.chain, height);
    if (cached) {
      return cached;
    }

    const blockData = await this.provider.getBlock(height);

    blockCache.setBlock(this.chain, height, blockData);

    return blockData;
  }

  [key: string]: any;
}

export function createCachedProvider(provider: Provider, chain: string): Provider {
  const cachedProvider = new CachedProvider(provider, chain);

  return new Proxy(cachedProvider, {
    get(target, prop, receiver) {
      if (prop in target) {
        return Reflect.get(target, prop, receiver);
      }

      const value = (target as any).provider[prop];

      if (typeof value === 'function') {
        return value.bind((target as any).provider);
      }

      return value;
    },

    set(target, prop, value) {
      if (prop === 'rpcs') {
        target.rpcs = value;
        (target as any).provider.rpcs = value;
        return true;
      }

      (target as any).provider[prop] = value;
      return true;
    }
  }) as Provider;
}

export function getProviderCacheStats() {
  return blockCache.getStats();
}

export function clearProviderCache() {
  blockCache.clearAll();
}
