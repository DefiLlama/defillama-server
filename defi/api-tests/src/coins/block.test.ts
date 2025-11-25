import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { BlockResponse, isBlockResponse } from './types';
import { blockResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.COINS.BASE_URL);

describe('Coins API - Block', () => {
  // Test with various chains
  const testChains = [
    'ethereum',
    'polygon',
    'arbitrum',
    'optimism',
    'avalanche',
    'bsc',
  ];

  // Test with different timestamps
  const testTimestamps = [
    { name: 'recent', timestamp: Math.floor(Date.now() / 1000) - 3600 }, // 1 hour ago
    { name: '1 day ago', timestamp: Math.floor(Date.now() / 1000) - 86400 },
    { name: '1 week ago', timestamp: Math.floor(Date.now() / 1000) - 86400 * 7 },
    { name: '1 month ago', timestamp: Math.floor(Date.now() / 1000) - 86400 * 30 },
  ];

  testChains.forEach((chain) => {
    describe(`Chain: ${chain}`, () => {
      testTimestamps.forEach(({ name, timestamp }) => {
        describe(`Timestamp: ${name}`, () => {
          let response: ApiResponse<BlockResponse>;

          beforeAll(async () => {
            response = await apiClient.get<BlockResponse>(
              endpoints.COINS.BLOCK(chain, timestamp)
            );
          }, 60000);

          describe('Basic Response Validation', () => {
            it('should return successful response with valid structure', () => {
              if (response.status === 200) {
                expectSuccessfulResponse(response);
                expect(response.data).toHaveProperty('height');
                expect(response.data).toHaveProperty('timestamp');
                expect(isBlockResponse(response.data)).toBe(true);
              } else {
                // Some chains may not have data for old timestamps
                expect(response.status).toBeGreaterThanOrEqual(400);
              }
            });

            it('should validate against Zod schema', () => {
              if (response.status === 200) {
                const result = validate(
                  response.data,
                  blockResponseSchema,
                  `Block-${chain}-${name}`
                );
                expect(result.success).toBe(true);
                if (!result.success) {
                  console.error('Validation errors:', result.errors.slice(0, 5));
                }
              }
            });
          });

          describe('Block Data Validation', () => {
            it('should have valid block height', () => {
              if (response.status === 200 && response.data.height) {
                expectValidNumber(response.data.height);
                expect(response.data.height).toBeGreaterThan(0);
                expect(Number.isInteger(response.data.height)).toBe(true);
              }
            });

            it('should have valid timestamp', () => {
              if (response.status === 200 && response.data.timestamp) {
                expectValidNumber(response.data.timestamp);
                expectValidTimestamp(response.data.timestamp);
              }
            });

            it('should have timestamp close to requested timestamp', () => {
              if (response.status === 200 && response.data.timestamp) {
                const diff = Math.abs(response.data.timestamp - timestamp);
                
                // Timestamp should be within reasonable range (e.g., 15 minutes)
                expect(diff).toBeLessThan(900);
              }
            });

            it('should have reasonable block height for chain', () => {
              if (response.status === 200 && response.data.height) {
                // Different chains have different block heights
                // Ethereum has millions of blocks, newer chains fewer
                expect(response.data.height).toBeGreaterThan(100);
                
                // Should not be unreasonably high
                expect(response.data.height).toBeLessThan(1e9);
              }
            });
          });

          describe('Data Quality Checks', () => {
            it('should have timestamp in the past', () => {
              if (response.status === 200 && response.data.timestamp) {
                const now = Math.floor(Date.now() / 1000);
                expect(response.data.timestamp).toBeLessThan(now);
              }
            });
          });
        });
      });

      describe(`Block Height Progression for ${chain}`, () => {
        it('should show increasing block heights over time', async () => {
          const oldTimestamp = Math.floor(Date.now() / 1000) - 86400 * 30; // 30 days ago
          const newTimestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
          
          const oldResponse = await apiClient.get<BlockResponse>(
            endpoints.COINS.BLOCK(chain, oldTimestamp)
          );
          const newResponse = await apiClient.get<BlockResponse>(
            endpoints.COINS.BLOCK(chain, newTimestamp)
          );
          
          if (oldResponse.status === 200 && newResponse.status === 200) {
            expect(newResponse.data.height).toBeGreaterThan(oldResponse.data.height);
            
            // Calculate average block time
            const blockDiff = newResponse.data.height - oldResponse.data.height;
            const timeDiff = newResponse.data.timestamp - oldResponse.data.timestamp;
            const avgBlockTime = timeDiff / blockDiff;
            
            expect(avgBlockTime).toBeGreaterThan(0);
            expect(avgBlockTime).toBeLessThan(60); // Most chains < 60s block time
            
            console.log(`${chain} average block time: ${avgBlockTime.toFixed(2)}s`);
          }
        }, 60000);
      });
    });
  });

  describe('Chain Comparison', () => {
    it('should compare block heights across chains', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      
      const responses = await Promise.all(
        testChains.map((chain) =>
          apiClient.get<BlockResponse>(endpoints.COINS.BLOCK(chain, timestamp))
        )
      );
      
      responses.forEach((response, index) => {
        if (response.status === 200) {
          console.log(`${testChains[index]}: Block ${response.data.height} at ${new Date(response.data.timestamp * 1000).toISOString()}`);
          
          expect(response.data.height).toBeGreaterThan(0);
          expectValidTimestamp(response.data.timestamp);
        }
      });
    }, 60000);
  });

  describe('Specific Chain Tests', () => {
    it('should return Ethereum block for specific timestamp', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400;
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', timestamp)
      );
      
      expect(response.status).toBe(200);
      expect(response.data.height).toBeGreaterThan(10000000); // Ethereum has millions of blocks
    });

    it('should return Polygon block for specific timestamp', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400;
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('polygon', timestamp)
      );
      
      if (response.status === 200) {
        expect(response.data.height).toBeGreaterThan(1000000); // Polygon has many blocks
      }
    });

    it('should return BSC block for specific timestamp', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400;
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('bsc', timestamp)
      );
      
      if (response.status === 200) {
        expect(response.data.height).toBeGreaterThan(1000000);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle very recent timestamp', async () => {
      const recentTimestamp = Math.floor(Date.now() / 1000) - 60; // 1 minute ago
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', recentTimestamp)
      );
      
      expect(response.status).toBe(200);
      expect(response.data.height).toBeGreaterThan(0);
    });

    it('should handle old timestamp', async () => {
      // 2 years ago
      const oldTimestamp = Math.floor(Date.now() / 1000) - 86400 * 365 * 2;
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', oldTimestamp)
      );
      
      expect(response.status).toBe(200);
      expect(response.data.height).toBeGreaterThan(0);
    });

    it('should handle future timestamp', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400;
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', futureTimestamp)
      );
      
      // Should either return current block or error
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should handle invalid chain gracefully', async () => {
      const timestamp = Math.floor(Date.now() / 1000) - 86400;
      const response = await apiClient.get(
        endpoints.COINS.BLOCK('invalid-chain', timestamp)
      );
      
      // Should return error for invalid chain
      if (response.status !== 200) {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle timestamp at chain genesis', async () => {
      // Ethereum genesis was in 2015
      const genesisTimestamp = Math.floor(new Date('2015-07-30').getTime() / 1000);
      const response = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', genesisTimestamp)
      );
      
      if (response.status === 200) {
        // Should return a very low block number
        expect(response.data.height).toBeGreaterThan(0);
        expect(response.data.height).toBeLessThan(1000);
      }
    });
  });

  describe('Block Time Analysis', () => {
    it('should calculate average block time for Ethereum', async () => {
      const endTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const startTime = endTime - 86400; // 24 hours before that
      
      const endBlock = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', endTime)
      );
      const startBlock = await apiClient.get<BlockResponse>(
        endpoints.COINS.BLOCK('ethereum', startTime)
      );
      
      if (endBlock.status === 200 && startBlock.status === 200) {
        const blockDiff = endBlock.data.height - startBlock.data.height;
        const timeDiff = endBlock.data.timestamp - startBlock.data.timestamp;
        const avgBlockTime = timeDiff / blockDiff;
        
        // Ethereum block time is around 12 seconds
        expect(avgBlockTime).toBeGreaterThan(10);
        expect(avgBlockTime).toBeLessThan(15);
        
        console.log(`Ethereum average block time: ${avgBlockTime.toFixed(2)}s`);
      }
    }, 60000);

    it('should calculate blocks per day for multiple chains', async () => {
      const endTime = Math.floor(Date.now() / 1000) - 3600;
      const startTime = endTime - 86400;
      
      const chainsToTest = ['ethereum', 'polygon', 'bsc'];
      
      for (const chain of chainsToTest) {
        const endBlock = await apiClient.get<BlockResponse>(
          endpoints.COINS.BLOCK(chain, endTime)
        );
        const startBlock = await apiClient.get<BlockResponse>(
          endpoints.COINS.BLOCK(chain, startTime)
        );
        
        if (endBlock.status === 200 && startBlock.status === 200) {
          const blocksPerDay = endBlock.data.height - startBlock.data.height;
          console.log(`${chain} blocks per day: ${blocksPerDay}`);
          
          expect(blocksPerDay).toBeGreaterThan(100);
        }
      }
    }, 90000);
  });
});

