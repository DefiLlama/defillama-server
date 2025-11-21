import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { UserDataArray, isUserDataArray } from './types';
import { userDataArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
  expectFreshData,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.USERS.BASE_URL);

describe('Active Users API - User Data', () => {
  // Configure test protocols and types - keep minimal for speed
  const testProtocols = ['319']; // Protocol ID (Uniswap V3)
  // const testProtocols = ['319', '1', '2522']; // Multiple protocols for thorough testing
  
  const testTypes = ['users', 'txs', 'newusers']; // Test all data types

  const userDataResponses: Record<string, Record<string, ApiResponse<UserDataArray>>> = {};

  beforeAll(async () => {
    // Fetch all test combinations in parallel
    await Promise.all(
      testProtocols.flatMap((protocol) =>
        testTypes.map(async (type) => {
          if (!userDataResponses[protocol]) {
            userDataResponses[protocol] = {};
          }
          userDataResponses[protocol][type] = await apiClient.get<UserDataArray>(
            endpoints.USERS.USER_DATA(type, protocol)
          );
        })
      )
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testProtocols.forEach((protocol) => {
      testTypes.forEach((type) => {
        describe(`Protocol: ${protocol}, Type: ${type}`, () => {
          it('should return successful response with valid structure', () => {
            const response = userDataResponses[protocol][type];
            expectSuccessfulResponse(response);
            expectArrayResponse(response);
            expect(isUserDataArray(response.data)).toBe(true);
          });

          it('should validate against Zod schema', () => {
            const response = userDataResponses[protocol][type];
            const result = validate(
              response.data,
              userDataArraySchema,
              `UserData-${protocol}-${type}`
            );
            expect(result.success).toBe(true);
            if (!result.success) {
              console.error('Validation errors (first 5):', result.errors.slice(0, 5));
            }
          });

          it('should return an array (may be empty for some protocols)', () => {
            const response = userDataResponses[protocol][type];
            expect(Array.isArray(response.data)).toBe(true);
            // Note: Some protocols may return empty arrays if no data is available
            expect(response.data.length).toBeGreaterThanOrEqual(0);
          });
        });
      });
    });
  });

  describe('Data Point Validation', () => {
    testProtocols.forEach((protocol) => {
      testTypes.forEach((type) => {
        describe(`Protocol: ${protocol}, Type: ${type}`, () => {
          it('should have required fields in all data points', () => {
            const response = userDataResponses[protocol][type];
            expectSuccessfulResponse(response);
            
            if (response.data.length > 0) {
              // Data points are tuples: [timestamp, value]
              response.data.slice(0, 10).forEach((point) => {
                expect(Array.isArray(point)).toBe(true);
                expect(point.length).toBe(2);
                expect(point[0]).toBeDefined(); // timestamp
                expect(point[1]).toBeDefined(); // value
              });
            }
          });

          it('should have valid timestamps', () => {
            const response = userDataResponses[protocol][type];
            expectSuccessfulResponse(response);
            
            if (response.data.length > 0) {
              // Timestamp is first element of tuple
              response.data.slice(0, 10).forEach((point) => {
                const timestamp = point[0];
                expect(typeof timestamp).toBe('number');
                expect(isNaN(timestamp)).toBe(false);
                expectValidTimestamp(timestamp);
              });
            }
          });

          it('should have valid metric values when present', () => {
            const response = userDataResponses[protocol][type];
            expectSuccessfulResponse(response);
            
            if (response.data.length > 0) {
              // Value is second element of tuple
              response.data.slice(0, 10).forEach((point) => {
                const value = typeof point[1] === 'string' ? Number(point[1]) : point[1];
                expectValidNumber(value);
                expectNonNegativeNumber(value);
              });
            }
          });

          it('should have data points in chronological order', () => {
            const response = userDataResponses[protocol][type];
            expectSuccessfulResponse(response);

            if (response.data.length > 1) {
              const timestamps = response.data.map((p) => p[0]);
              const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
              expect(timestamps).toEqual(sortedTimestamps);
            }
          });
        });
      });
    });
  });

  describe('Data Freshness Validation', () => {
    testProtocols.forEach((protocol) => {
      testTypes.forEach((type) => {
        describe(`Protocol: ${protocol}, Type: ${type}`, () => {
          it('should have fresh data (most recent timestamp within 7 days)', () => {
            const response = userDataResponses[protocol][type];
            expectSuccessfulResponse(response);

            if (response.data.length > 0) {
              // Timestamps are first element of each tuple
              const timestamps = response.data.map((point) => point[0]);
              // Active users data might update less frequently, allow 7 days
              expectFreshData(timestamps, 7 * 86400);
            }
          });
        });
      });
    });
  });

  describe('Type-Specific Validation', () => {
    testProtocols.forEach((protocol) => {
      describe(`Protocol: ${protocol}`, () => {
        it('should return valid data for users type', () => {
          if (testTypes.includes('users')) {
            const response = userDataResponses[protocol]['users'];
            expectSuccessfulResponse(response);
            
            if (response.data.length > 0) {
              // Validate sample of tuples
              response.data.slice(0, 10).forEach((point) => {
                const value = typeof point[1] === 'string' ? Number(point[1]) : point[1];
                expectNonNegativeNumber(value);
              });
            }
          }
        });

        it('should return valid data for txs type', () => {
          if (testTypes.includes('txs')) {
            const response = userDataResponses[protocol]['txs'];
            expectSuccessfulResponse(response);
            
            if (response.data.length > 0) {
              // Validate sample of tuples
              response.data.slice(0, 10).forEach((point) => {
                const value = typeof point[1] === 'string' ? Number(point[1]) : point[1];
                expectNonNegativeNumber(value);
              });
            }
          }
        });

        it('should return valid data for newusers type', () => {
          if (testTypes.includes('newusers')) {
            const response = userDataResponses[protocol]['newusers'];
            expectSuccessfulResponse(response);
            
            if (response.data.length > 0) {
              // Validate sample of tuples
              response.data.slice(0, 10).forEach((point) => {
                const value = typeof point[1] === 'string' ? Number(point[1]) : point[1];
                expectNonNegativeNumber(value);
              });
            }
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<UserDataArray>(
        endpoints.USERS.USER_DATA('users', 'non-existent-protocol-xyz-123')
      );
      
      // API might return 200 with empty array or 4xx status
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle invalid type gracefully', async () => {
      const response = await apiClient.get<UserDataArray>(
        endpoints.USERS.USER_DATA('invalid-type-xyz', testProtocols[0])
      );
      
      // API might return 200 with empty array or 4xx status
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle data points with zero values', () => {
      testProtocols.forEach((protocol) => {
        testTypes.forEach((type) => {
          const response = userDataResponses[protocol][type];
          expectSuccessfulResponse(response);
          
          // Filter tuples where value is 0
          const withZeroValues = response.data.filter((p) => {
            const value = typeof p[1] === 'string' ? Number(p[1]) : p[1];
            return value === 0;
          });

          if (withZeroValues.length > 0) {
            withZeroValues.slice(0, 5).forEach((point) => {
              expect(point[0]).toBeDefined(); // timestamp
              expect(point[1]).toBeDefined(); // value (which is 0)
            });
          }
        });
      });
    });
  });
});

