import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ActiveUsersResponse, isActiveUsersResponse } from './types';
import { activeUsersResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectObjectResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.USERS.BASE_URL);

describe('Active Users API - Active Users', () => {
  let activeUsersResponse: ApiResponse<ActiveUsersResponse>;

  beforeAll(async () => {
    activeUsersResponse = await apiClient.get<ActiveUsersResponse>(endpoints.USERS.ACTIVE_USERS);
  }, 60000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(activeUsersResponse);
      expectObjectResponse(activeUsersResponse);
      expect(isActiveUsersResponse(activeUsersResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(activeUsersResponse.data, activeUsersResponseSchema, 'ActiveUsers');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have minimum number of protocols', () => {
      const protocolIds = Object.keys(activeUsersResponse.data);
      expect(protocolIds.length).toBeGreaterThan(10);
    });

    it('should have valid protocol IDs as keys', () => {
      const protocolIds = Object.keys(activeUsersResponse.data);
      
      // Sample-based testing - validate first 10 protocol IDs
      protocolIds.slice(0, 10).forEach((protocolId) => {
        expectNonEmptyString(protocolId);
      });
    });
  });

  describe('Data Validation', () => {
    it('should have name field for protocol entries', () => {
      // Filter for protocol entries (not chain aggregates like "chain#ethereum")
      const protocolEntries = Object.entries(activeUsersResponse.data).filter(
        ([id]) => !id.startsWith('chain#')
      );
      expect(protocolEntries.length).toBeGreaterThan(0);
      
      // Sample-based testing - validate first 10 protocol entries
      protocolEntries.slice(0, 10).forEach(([, data]) => {
        if (data.name) {
          expectNonEmptyString(data.name);
        }
      });
    });

    it('should have valid users metric when present', () => {
      const protocolsWithUsers = Object.entries(activeUsersResponse.data).filter(
        ([, data]) => data.users !== undefined
      );
      expect(protocolsWithUsers.length).toBeGreaterThan(0);

      // Sample-based testing - validate first 10 protocols with users
      protocolsWithUsers.slice(0, 10).forEach(([, data]) => {
        expect(data.users).toHaveProperty('value');
        expect(data.users).toHaveProperty('end');
        
        // Value can be number or string
        const userValue = typeof data.users!.value === 'string' 
          ? Number(data.users!.value) 
          : data.users!.value;
        expectValidNumber(userValue);
        expectNonNegativeNumber(userValue);
        expect(userValue).toBeLessThan(1_000_000_000);
        
        // End should be a valid timestamp
        expectValidTimestamp(data.users!.end);
      });
    });

    it('should have valid txs metric when present', () => {
      const protocolsWithTxs = Object.entries(activeUsersResponse.data).filter(
        ([, data]) => data.txs !== undefined
      );

      if (protocolsWithTxs.length > 0) {
        // Sample-based testing - validate first 10 protocols
        protocolsWithTxs.slice(0, 10).forEach(([, data]) => {
          expect(data.txs).toHaveProperty('value');
          expect(data.txs).toHaveProperty('end');
          
          // Value can be number or string
          const txsValue = typeof data.txs!.value === 'string' 
            ? Number(data.txs!.value) 
            : data.txs!.value;
          expectValidNumber(txsValue);
          expectNonNegativeNumber(txsValue);
          
          expectValidTimestamp(data.txs!.end);
        });
      }
    });

    it('should have valid gasUsd metric when present', () => {
      const protocolsWithGas = Object.entries(activeUsersResponse.data).filter(
        ([, data]) => data.gasUsd !== undefined
      );

      if (protocolsWithGas.length > 0) {
        // Sample-based testing - validate first 10 protocols
        protocolsWithGas.slice(0, 10).forEach(([, data]) => {
          expect(data.gasUsd).toHaveProperty('value');
          expect(data.gasUsd).toHaveProperty('end');
          
          const gasValue = typeof data.gasUsd!.value === 'string' 
            ? Number(data.gasUsd!.value) 
            : data.gasUsd!.value;
          expectValidNumber(gasValue);
          expectNonNegativeNumber(gasValue);
          
          expectValidTimestamp(data.gasUsd!.end);
        });
      }
    });

    it('should have valid change percentages when present', () => {
      const protocolsWithChange = Object.entries(activeUsersResponse.data).filter(
        ([, data]) => data.change_1d !== undefined || data.change_7d !== undefined || data.change_1m !== undefined
      );

      if (protocolsWithChange.length > 0) {
        // Sample-based testing - validate first 10 protocols
        protocolsWithChange.slice(0, 10).forEach(([, data]) => {
          if (data.change_1d !== null && data.change_1d !== undefined) {
            // Change can be a number or a metric object
            if (typeof data.change_1d === 'number') {
              expectValidNumber(data.change_1d);
              expect(Math.abs(data.change_1d)).toBeLessThan(1000);
            }
          }
          if (data.change_7d !== null && data.change_7d !== undefined) {
            if (typeof data.change_7d === 'number') {
              expectValidNumber(data.change_7d);
              expect(Math.abs(data.change_7d)).toBeLessThan(1000);
            }
          }
          if (data.change_1m !== null && data.change_1m !== undefined) {
            if (typeof data.change_1m === 'number') {
              expectValidNumber(data.change_1m);
              expect(Math.abs(data.change_1m)).toBeLessThan(1000);
            }
          }
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle protocols with null change values', () => {
      const protocolsWithNullChange = Object.entries(activeUsersResponse.data).filter(
        ([, data]) => data.change_1d === null || data.change_7d === null || data.change_1m === null
      );

      if (protocolsWithNullChange.length > 0) {
        protocolsWithNullChange.slice(0, 5).forEach(([, data]) => {
          // Null values should be acceptable
          if (data.change_1d === null) {
            expect(data.change_1d).toBeNull();
          }
          if (data.change_7d === null) {
            expect(data.change_7d).toBeNull();
          }
          if (data.change_1m === null) {
            expect(data.change_1m).toBeNull();
          }
        });
      }
    });

    it('should handle protocols with zero users', () => {
      const protocolsWithZeroUsers = Object.entries(activeUsersResponse.data).filter(
        ([, data]) => data.users && Number(data.users.value) === 0
      );

      if (protocolsWithZeroUsers.length > 0) {
        protocolsWithZeroUsers.slice(0, 5).forEach(([, data]) => {
          const userValue = typeof data.users!.value === 'string'
            ? Number(data.users!.value)
            : data.users!.value;
          expect(userValue).toBe(0);
          expectNonEmptyString(data.name);
        });
      }
    });

    it('should have consistent end timestamps across metrics for same protocol', () => {
      const protocols = Object.entries(activeUsersResponse.data);
      
      // Sample-based testing - check first 10 protocols with multiple metrics
      protocols.slice(0, 10).forEach(([, data]) => {
        const timestamps: number[] = [];
        
        if (data.users) timestamps.push(data.users.end);
        if (data.txs) timestamps.push(data.txs.end);
        if (data.gasUsd) timestamps.push(data.gasUsd.end);
        if (data.newUsers) timestamps.push(data.newUsers.end);
        
        if (timestamps.length > 1) {
          // All timestamps should be the same (or very close) for a given protocol
          const uniqueTimestamps = [...new Set(timestamps)];
          // Allow some variation (within 1 hour = 3600 seconds)
          if (uniqueTimestamps.length > 1) {
            const maxDiff = Math.max(...timestamps) - Math.min(...timestamps);
            expect(maxDiff).toBeLessThan(3600);
          }
        }
      });
    });
  });
});
