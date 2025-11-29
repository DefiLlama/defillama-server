import { createCachedProvider, getProviderCacheStats, clearProviderCache } from './cachedProvider';

describe('CachedProvider', () => {
  const createMockProvider = () => {
    let getBlockCallCount = 0;

    return {
      rpcs: ['rpc1', 'rpc2'],
      getBlock: jest.fn(async (height: number | 'latest') => {
        getBlockCallCount++;
        return {
          number: height === 'latest' ? 99999 : height,
          timestamp: 1234567890 + (height === 'latest' ? 0 : Number(height))
        };
      }),
      otherMethod: jest.fn(() => 'other-result'),
      someProperty: 'test-value',
      getCallCount: () => getBlockCallCount
    };
  };

  beforeEach(() => {
    clearProviderCache();
  });

  describe('Basic Caching', () => {
    it('should cache getBlock calls for specific block numbers', async () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      const block1 = await cachedProvider.getBlock(12345);
      expect(mockProvider.getBlock).toHaveBeenCalledTimes(1);
      expect(block1.number).toBe(12345);

      const block2 = await cachedProvider.getBlock(12345);
      expect(mockProvider.getBlock).toHaveBeenCalledTimes(1);
      expect(block2).toEqual(block1);
    });

    it('should cache latest block requests', async () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      const block1 = await cachedProvider.getBlock('latest');
      expect(mockProvider.getBlock).toHaveBeenCalledTimes(1);

      const block2 = await cachedProvider.getBlock('latest');
      expect(mockProvider.getBlock).toHaveBeenCalledTimes(1);
      expect(block2).toEqual(block1);
    });

    it('should cache different block numbers separately', async () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      await cachedProvider.getBlock(12345);
      await cachedProvider.getBlock(12346);
      await cachedProvider.getBlock(12345); // cached

      expect(mockProvider.getBlock).toHaveBeenCalledTimes(2);
    });
  });

  describe('Provider Proxy', () => {
    it('should forward other methods to underlying provider', async () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      const result = (cachedProvider as any).otherMethod();
      expect(result).toBe('other-result');
      expect(mockProvider.otherMethod).toHaveBeenCalled();
    });

    it('should forward property access to underlying provider', () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      expect((cachedProvider as any).someProperty).toBe('test-value');
    });

    it('should allow modifying rpcs property', () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      expect(cachedProvider.rpcs).toEqual(['rpc1', 'rpc2']);

      cachedProvider.rpcs = ['rpc3'];
      expect(cachedProvider.rpcs).toEqual(['rpc3']);
      expect(mockProvider.rpcs).toEqual(['rpc3']);
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache statistics', async () => {
      const mockProvider = createMockProvider();
      const cachedProvider = createCachedProvider(mockProvider as any, 'ethereum');

      await cachedProvider.getBlock(12345);
      await cachedProvider.getBlock('latest');

      const stats = getProviderCacheStats();
      expect(stats.blockNumberCacheSize).toBe(1);
      expect(stats.latestBlockCacheSize).toBe(1);
    });
  });

  describe('Multi-chain Support', () => {
    it('should cache blocks separately for different chains', async () => {
      const ethProvider = createMockProvider();
      const bscProvider = createMockProvider();

      const cachedEthProvider = createCachedProvider(ethProvider as any, 'ethereum');
      const cachedBscProvider = createCachedProvider(bscProvider as any, 'bsc');

      await cachedEthProvider.getBlock(12345);
      await cachedBscProvider.getBlock(12345);
      await cachedEthProvider.getBlock(12345); // cached
      await cachedBscProvider.getBlock(12345); // cached

      expect(ethProvider.getBlock).toHaveBeenCalledTimes(1);
      expect(bscProvider.getBlock).toHaveBeenCalledTimes(1);
    });
  });
});
