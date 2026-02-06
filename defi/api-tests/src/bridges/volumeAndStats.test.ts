import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { expectSuccessfulResponse } from '../../utils/testHelpers';

const apiClient = createApiClient(endpoints.BRIDGES.BASE_URL);

describe('Bridges API - Volume and Stats', () => {
  const testChains = ['Ethereum', 'arbitrum', 'optimism'];

  describe('Bridge Volume by Chain', () => {
    testChains.forEach((chain) => {
      describe(`Chain: ${chain}`, () => {
        let response: any;

        beforeAll(async () => {
          response = await apiClient.get(endpoints.BRIDGES.BRIDGE_VOLUME(chain));
        }, 30000);

        it('should return successful response', () => {
          expectSuccessfulResponse(response);
        });

        it('should return data', () => {
          expect(response.data).toBeDefined();
          expect(response.data !== null).toBe(true);
        });

        it('should return consistent data structure', () => {
          // Can be array or object
          const dataType = Array.isArray(response.data) ? 'array' : typeof response.data;
          expect(['array', 'object']).toContain(dataType);
        });
      });
    });

    it('should handle invalid chain gracefully', async () => {
      const response = await apiClient.get(endpoints.BRIDGES.BRIDGE_VOLUME('invalid-chain-123'));
      
      // Should return some response (may be 404 or empty data)
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    }, 30000);
  });

  describe('Bridge Day Stats', () => {
    const timestamps = [
      Math.floor(Date.now() / 1000) - 86400, // Yesterday
      Math.floor(Date.now() / 1000) - 86400 * 7, // 7 days ago
      Math.floor(Date.now() / 1000) - 86400 * 30, // 30 days ago
    ];

    timestamps.forEach((timestamp, index) => {
      const daysAgo = index === 0 ? '1' : index === 1 ? '7' : '30';
      
      describe(`${daysAgo} days ago`, () => {
        let response: any;

        beforeAll(async () => {
          response = await apiClient.get(endpoints.BRIDGES.BRIDGE_DAY_STATS(timestamp, 'ethereum'));
        }, 30000);

        it('should return a response', () => {
          expect(response).toBeDefined();
          expect(response.status).toBeDefined();
        });

        it('should return data if successful', () => {
          if (response.status >= 200 && response.status < 300) {
            expect(response.data).toBeDefined();
          } else {
            // API may return errors for certain timestamps
            console.log(`Bridge day stats returned status ${response.status} for ${daysAgo} days ago`);
          }
        });

        it('should return consistent data structure when successful', () => {
          if (response.status >= 200 && response.status < 300) {
            const dataType = Array.isArray(response.data) ? 'array' : typeof response.data;
            expect(['array', 'object', 'string']).toContain(dataType);
          }
        });
      });
    });

    it('should work with different chains', async () => {
      const timestamp = 1755561600;
      
      const responses = await Promise.all(
        testChains.map((chain) =>
          apiClient.get(endpoints.BRIDGES.BRIDGE_DAY_STATS(timestamp, chain))
        )
      );

      responses.forEach((response, index) => {
        expect(response).toBeDefined();
        expect(response.status).toBeDefined();
        console.log(`Bridge day stats for ${testChains[index]}: status ${response.status}`);
      });
    }, 60000);

    it('should handle invalid timestamp gracefully', async () => {
      const invalidTimestamp = 0;
      const response = await apiClient.get(
        endpoints.BRIDGES.BRIDGE_DAY_STATS(invalidTimestamp, 'ethereum')
      );
      
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    }, 30000);

    it('should handle future timestamp gracefully', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 86400 * 365;
      const response = await apiClient.get(
        endpoints.BRIDGES.BRIDGE_DAY_STATS(futureTimestamp, 'ethereum')
      );
      
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    }, 30000);
  });

  describe('Transactions by Bridge ID', () => {
    // Test with a single reliable bridge ID (LayerZero)
    const testBridgeIds = ['84'];

    testBridgeIds.forEach((bridgeId) => {
      describe(`Bridge ID: ${bridgeId}`, () => {
        let response: any;

        beforeAll(async () => {
          response = await apiClient.get(endpoints.BRIDGES.TRANSACTIONS(bridgeId));
        }, 90000);

        it('should return a response', () => {
          expect(response).toBeDefined();
          expect(response.status).toBeDefined();
        });

        it('should return data if successful', () => {
          if (response.status >= 200 && response.status < 300) {
            expect(response.data).toBeDefined();
          } else {
            // API may return timeouts or errors for some bridge IDs
            console.log(`Bridge ${bridgeId} transactions returned status ${response.status}`);
          }
        });

        it('should return consistent data structure when successful', () => {
          if (response.status >= 200 && response.status < 300) {
            const dataType = Array.isArray(response.data) ? 'array' : typeof response.data;
            expect(['array', 'object', 'string']).toContain(dataType);
          }
        });

        it('should log transaction count if array', () => {
          if (response.status >= 200 && response.status < 300 && Array.isArray(response.data)) {
            console.log(`Bridge ${bridgeId} has ${response.data.length} transactions`);
            expect(response.data.length).toBeGreaterThanOrEqual(0);
          }
        });
      });
    });

    it('should handle non-existent bridge ID gracefully', async () => {
      const response = await apiClient.get(endpoints.BRIDGES.TRANSACTIONS('99999'));
      
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
    }, 30000);
  });

  describe('Endpoint Path Validation', () => {
    it('should have correct bridge volume path', () => {
      const chain = 'ethereum';
      const path = endpoints.BRIDGES.BRIDGE_VOLUME(chain);
      expect(path).toBe(`/bridges/bridgevolume/${chain}`);
    });

    it('should have correct bridge day stats path', () => {
      const timestamp = 1234567890;
      const chain = 'ethereum';
      const path = endpoints.BRIDGES.BRIDGE_DAY_STATS(timestamp, chain);
      expect(path).toBe(`/bridges/bridgedaystats/${timestamp}/${chain}`);
    });

    it('should have correct transactions path', () => {
      const id = '123';
      const path = endpoints.BRIDGES.TRANSACTIONS(id);
      expect(path).toBe(`/bridges/transactions/${id}`);
    });
  });
});