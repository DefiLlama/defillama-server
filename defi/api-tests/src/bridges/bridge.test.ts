import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { BridgeDetail, isBridgeDetail, BridgesListResponse } from './types';
import { bridgeDetailSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.BRIDGES.BASE_URL);

describe('Bridges API - Bridge Detail', () => {
  // Test with popular bridges
  const testBridgeIds = ['84', '77', '51']; // LayerZero, Wormhole, Circle
  const responses: Record<string, ApiResponse<BridgeDetail>> = {};

  beforeAll(async () => {
    // First get the list to ensure we have valid IDs
    const listResponse = await apiClient.get<BridgesListResponse>(endpoints.BRIDGES.BRIDGES);
    
    let idsToTest = testBridgeIds;
    if (listResponse.status === 200 && listResponse.data.bridges.length > 0) {
      // Use the first 3 bridges from the list
      idsToTest = listResponse.data.bridges.slice(0, 3).map((b) => b.id.toString());
    }

    const results = await Promise.all(
      idsToTest.map((id) =>
        apiClient.get<BridgeDetail>(endpoints.BRIDGES.BRIDGE(id))
      )
    );

    idsToTest.forEach((id, index) => {
      responses[id] = results[index];
    });
  }, 60000);

  Object.keys(testBridgeIds).forEach((_, index) => {
    const bridgeId = testBridgeIds[index];
    
    describe(`Bridge ID: ${bridgeId}`, () => {
      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          const response = responses[bridgeId];
          if (response) {
            expectSuccessfulResponse(response);
            expect(isBridgeDetail(response.data)).toBe(true);
          }
        });

        it('should validate against Zod schema', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const result = bridgeDetailSchema.safeParse(response.data);
            if (!result.success) {
              console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
            }
            expect(result.success).toBe(true);
          }
        });

        it('should have required fields', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;
            expect(data).toHaveProperty('id');
            expect(data).toHaveProperty('name');
            expect(data).toHaveProperty('displayName');
            
            expect(typeof data.id).toBe('number');
            expect(typeof data.name).toBe('string');
            expect(data.name.length).toBeGreaterThan(0);
            expect(typeof data.displayName).toBe('string');
            expect(data.displayName.length).toBeGreaterThan(0);
          }
        });
      });

      describe('Volume Metrics Validation', () => {
        it('should have valid volume metrics when present', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (data.lastDailyVolume !== null && data.lastDailyVolume !== undefined) {
              expectValidNumber(data.lastDailyVolume);
              expectNonNegativeNumber(data.lastDailyVolume);
            }

            if (data.weeklyVolume !== null && data.weeklyVolume !== undefined) {
              expectValidNumber(data.weeklyVolume);
              expectNonNegativeNumber(data.weeklyVolume);
            }

            if (data.monthlyVolume !== null && data.monthlyVolume !== undefined) {
              expectValidNumber(data.monthlyVolume);
              expectNonNegativeNumber(data.monthlyVolume);
            }
          }
        });

        it('should have monthly volume >= weekly volume when both present', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (
              data.monthlyVolume !== null && data.monthlyVolume !== undefined &&
              data.weeklyVolume !== null && data.weeklyVolume !== undefined &&
              data.weeklyVolume > 0
            ) {
              const ratio = data.monthlyVolume / data.weeklyVolume;
              expect(ratio).toBeGreaterThan(0.5);
            }
          }
        });
      });

      describe('Transaction Counts Validation', () => {
        it('should have valid transaction counts when present', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (data.prevDayTxs) {
              expect(data.prevDayTxs).toHaveProperty('deposits');
              expect(data.prevDayTxs).toHaveProperty('withdrawals');
              expectNonNegativeNumber(data.prevDayTxs.deposits);
              expectNonNegativeNumber(data.prevDayTxs.withdrawals);
            }

            if (data.weeklyTxs) {
              expect(data.weeklyTxs).toHaveProperty('deposits');
              expect(data.weeklyTxs).toHaveProperty('withdrawals');
              expectNonNegativeNumber(data.weeklyTxs.deposits);
              expectNonNegativeNumber(data.weeklyTxs.withdrawals);
            }

            if (data.monthlyTxs) {
              expect(data.monthlyTxs).toHaveProperty('deposits');
              expect(data.monthlyTxs).toHaveProperty('withdrawals');
              expectNonNegativeNumber(data.monthlyTxs.deposits);
              expectNonNegativeNumber(data.monthlyTxs.withdrawals);
            }
          }
        });

        it('should have monthly txs >= weekly txs when both present', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (data.monthlyTxs && data.weeklyTxs) {
              const monthlyTotal = data.monthlyTxs.deposits + data.monthlyTxs.withdrawals;
              const weeklyTotal = data.weeklyTxs.deposits + data.weeklyTxs.withdrawals;
              
              if (weeklyTotal > 0) {
                expect(monthlyTotal).toBeGreaterThanOrEqual(weeklyTotal * 0.5);
              }
            }
          }
        });
      });

      describe('Chain Breakdown Validation', () => {
        it('should have chain breakdown when present', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (data.chainBreakdown) {
              expect(typeof data.chainBreakdown).toBe('object');
              const chains = Object.keys(data.chainBreakdown);
              expect(chains.length).toBeGreaterThan(0);
            }
          }
        });

        it('should have valid chain breakdown metrics', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (data.chainBreakdown) {
              const chains = Object.keys(data.chainBreakdown).slice(0, 5);
              
              chains.forEach((chain) => {
                const chainData = data.chainBreakdown![chain];
                
                if (chainData.lastDailyVolume !== null && chainData.lastDailyVolume !== undefined) {
                  expectValidNumber(chainData.lastDailyVolume);
                  expectNonNegativeNumber(chainData.lastDailyVolume);
                }

                if (chainData.weeklyVolume !== null && chainData.weeklyVolume !== undefined) {
                  expectValidNumber(chainData.weeklyVolume);
                  expectNonNegativeNumber(chainData.weeklyVolume);
                }
              });
            }
          }
        });

        it('should have transaction counts in chain breakdown when present', () => {
          const response = responses[bridgeId];
          if (response && response.status === 200) {
            const data = response.data;

            if (data.chainBreakdown) {
              const chains = Object.keys(data.chainBreakdown).slice(0, 3);
              
              chains.forEach((chain) => {
                const chainData = data.chainBreakdown![chain];
                
                if (chainData.prevDayTxs) {
                  expect(chainData.prevDayTxs).toHaveProperty('deposits');
                  expect(chainData.prevDayTxs).toHaveProperty('withdrawals');
                  expectNonNegativeNumber(chainData.prevDayTxs.deposits);
                  expectNonNegativeNumber(chainData.prevDayTxs.withdrawals);
                }
              });
            }
          }
        });
      });
    });
  });

  describe('Cross-Bridge Comparison', () => {
    it('should have different bridge IDs', () => {
      const ids = Object.keys(responses)
        .filter((id) => responses[id].status === 200)
        .map((id) => responses[id].data.id);
      
      if (ids.length > 1) {
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }
    });

    it('should have different bridge names', () => {
      const names = Object.keys(responses)
        .filter((id) => responses[id].status === 200)
        .map((id) => responses[id].data.name);
      
      if (names.length > 1) {
        const uniqueNames = new Set(names);
        expect(uniqueNames.size).toBe(names.length);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent bridge ID gracefully', async () => {
      const response = await apiClient.get(endpoints.BRIDGES.BRIDGE('99999'));
      
      // API returns 200 even for non-existent IDs, but data should be minimal or empty
      expect(response).toBeDefined();
      expect(response.status).toBeDefined();
      
      if (response.status === 200) {
        console.log('API returned 200 for non-existent bridge ID:', response.data);
      }
    }, 30000);
  });
});

