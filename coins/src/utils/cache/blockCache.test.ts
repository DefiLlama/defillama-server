import { BlockCache } from './blockCache';

describe('BlockCache', () => {
  let cache: BlockCache;

  beforeEach(() => {
    cache = new BlockCache();
  });

  describe('Block Number Cache', () => {
    it('should cache and retrieve specific block numbers', () => {
      const blockData = { number: 12345, timestamp: 1234567890 };

      cache.setBlock('ethereum', 12345, blockData);
      const retrieved = cache.getBlock('ethereum', 12345);

      expect(retrieved).toEqual(blockData);
    });

    it('should cache blocks for different chains separately', () => {
      const ethBlock = { number: 12345, timestamp: 1234567890 };
      const bscBlock = { number: 54321, timestamp: 9876543210 };

      cache.setBlock('ethereum', 12345, ethBlock);
      cache.setBlock('bsc', 54321, bscBlock);

      expect(cache.getBlock('ethereum', 12345)).toEqual(ethBlock);
      expect(cache.getBlock('bsc', 54321)).toEqual(bscBlock);
    });

    it('should return undefined for non-existent blocks', () => {
      const retrieved = cache.getBlock('ethereum', 99999);
      expect(retrieved).toBeUndefined();
    });

    it('should respect LRU eviction when cache is full', () => {
      for (let i = 0; i < 100; i++) {
        cache.setBlock('ethereum', i, { number: i, timestamp: 1000 + i });
      }

      let stats = cache.getStats();
      expect(stats.blockNumberCacheSize).toBe(100);

      for (let i = 0; i < 100; i++) {
        const block = cache.getBlock('ethereum', i);
        expect(block).toBeDefined();
        expect(block?.number).toBe(i);
      }

      cache.setBlock('ethereum', 100, { number: 100, timestamp: 1100 });

      stats = cache.getStats();
      expect(stats.blockNumberCacheSize).toBe(100);
      expect(cache.getBlock('ethereum', 0)).toBeUndefined();
      expect(cache.getBlock('ethereum', 100)).toBeDefined();

      for (let i = 101; i < 151; i++) {
        cache.setBlock('ethereum', i, { number: i, timestamp: 1000 + i });
      }

      stats = cache.getStats();
      expect(stats.blockNumberCacheSize).toBe(100);

      for (let i = 0; i <= 50; i++) {
        expect(cache.getBlock('ethereum', i)).toBeUndefined();
      }

      for (let i = 51; i < 151; i++) {
        const block = cache.getBlock('ethereum', i);
        expect(block).toBeDefined();
        expect(block?.number).toBe(i);
      }
    });
  });

  describe('Latest Block Cache', () => {
    it('should cache and retrieve latest blocks per chain', () => {
      const latestBlock = { number: 99999, timestamp: 1234567890 };

      cache.setBlock('ethereum', 'latest', latestBlock);
      const retrieved = cache.getBlock('ethereum', 'latest');

      expect(retrieved).toEqual(latestBlock);
    });

    it('should cache latest blocks for different chains separately', () => {
      const ethLatest = { number: 99999, timestamp: 1234567890 };
      const bscLatest = { number: 88888, timestamp: 9876543210 };

      cache.setBlock('ethereum', 'latest', ethLatest);
      cache.setBlock('bsc', 'latest', bscLatest);

      expect(cache.getBlock('ethereum', 'latest')).toEqual(ethLatest);
      expect(cache.getBlock('bsc', 'latest')).toEqual(bscLatest);
    });

    it('should update latest block when set multiple times', () => {
      const firstBlock = { number: 99999, timestamp: 1234567890 };
      const secondBlock = { number: 100000, timestamp: 1234567900 };

      cache.setBlock('ethereum', 'latest', firstBlock);
      cache.setBlock('ethereum', 'latest', secondBlock);

      const retrieved = cache.getBlock('ethereum', 'latest');
      expect(retrieved).toEqual(secondBlock);
    });
  });

  describe('Cache Statistics', () => {
    it('should return correct cache sizes', () => {
      cache.setBlock('ethereum', 12345, { number: 12345, timestamp: 1000 });
      cache.setBlock('ethereum', 'latest', { number: 99999, timestamp: 2000 });
      cache.setBlock('bsc', 'latest', { number: 88888, timestamp: 3000 });

      const stats = cache.getStats();
      expect(stats.blockNumberCacheSize).toBe(1);
      expect(stats.latestBlockCacheSize).toBe(2);
    });
  });

  describe('Cache Clear', () => {
    it('should clear all caches', () => {
      cache.setBlock('ethereum', 12345, { number: 12345, timestamp: 1000 });
      cache.setBlock('ethereum', 'latest', { number: 99999, timestamp: 2000 });

      cache.clearAll();

      const stats = cache.getStats();
      expect(stats.blockNumberCacheSize).toBe(0);
      expect(stats.latestBlockCacheSize).toBe(0);
    });
  });
});
