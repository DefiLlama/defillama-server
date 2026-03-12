import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { OpenInterestResponse, isOpenInterestResponse } from './types';
import { openInterestResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectFreshData,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';
import { validate } from '../../utils/validation';

const apiClient = createApiClient(endpoints.PERPS.BASE_URL);

describe('Perps API - Open Interest', () => {
  let openInterestResponse: ApiResponse<OpenInterestResponse>;

  beforeAll(async () => {
    openInterestResponse = await apiClient.get<OpenInterestResponse>(
      endpoints.PERPS.OVERVIEW_OPEN_INTEREST
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(openInterestResponse);
      expect(isOpenInterestResponse(openInterestResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        openInterestResponse.data,
        openInterestResponseSchema,
        'OpenInterestResponse'
      );
      expect(result.success).toBe(true);
    });

    it('should return valid data structure', () => {
      const isArray = Array.isArray(openInterestResponse.data);
      const isObject = typeof openInterestResponse.data === 'object' && openInterestResponse.data !== null;
      
      expect(isArray || isObject).toBe(true);
      
      if (isArray) {
        expect(openInterestResponse.data.length).toBeGreaterThan(0);
        console.log('Open Interest returned array with', openInterestResponse.data.length, 'data points');
      } else {
        expect(Object.keys(openInterestResponse.data).length).toBeGreaterThan(0);
        console.log('Open Interest returned aggregated object');
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have valid data structure', () => {
      const isArray = Array.isArray(openInterestResponse.data);
      const isObject = typeof openInterestResponse.data === 'object' && !isArray;
      
      expect(isArray || isObject).toBe(true);
      
      if (isArray) {
        expect(openInterestResponse.data.length).toBeGreaterThan(0);
        
        // Validate array format
        for (let i = 1; i < (openInterestResponse.data as [number, number][]).length; i++) {
          const prevTimestamp = (openInterestResponse.data as [number, number][])[i - 1][0];
          const currTimestamp = (openInterestResponse.data as [number, number][])[i][0];
          expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
        }
        
        // Validate data points
        (openInterestResponse.data as [number, number][]).slice(0, 20).forEach(([timestamp, value]) => {
          expectValidNumber(timestamp);
          expectValidNumber(value);
          expectNonNegativeNumber(value);
          expect(timestamp).toBeGreaterThan(0);
          expect(value).toBeGreaterThan(0);
          expect(value).toBeLessThan(1_000_000_000_000);
        });
        
        // Check freshness
        const timestamps = (openInterestResponse.data as [number, number][]).map((point) => point[0]);
        expectFreshData(timestamps, 86400 * 2);
      } else {
        const data = openInterestResponse.data as any;
        expect(Object.keys(data).length).toBeGreaterThan(0);
        
        // Validate aggregated metrics
        if (data.total24h !== undefined && data.total24h !== null) {
          expectValidNumber(data.total24h);
          expectNonNegativeNumber(data.total24h);
        }
        
        if (data.total7d !== undefined && data.total7d !== null) {
          expectValidNumber(data.total7d);
          expectNonNegativeNumber(data.total7d);
        }
        
        if (data.totalAllTime !== undefined && data.totalAllTime !== null) {
          expectValidNumber(data.totalAllTime);
          expectNonNegativeNumber(data.totalAllTime);
        }
        
        // Validate protocols array
        if (data.protocols !== undefined) {
          expect(Array.isArray(data.protocols)).toBe(true);
          expect(data.protocols.length).toBeGreaterThan(0);
        }
        
        // Validate chart data
        if (data.totalDataChart !== undefined && data.totalDataChart !== null) {
          expect(Array.isArray(data.totalDataChart)).toBe(true);
          
          if (data.totalDataChart.length > 0) {
            const firstPoint = data.totalDataChart[0] as [number, number];
            expect(Array.isArray(firstPoint)).toBe(true);
            expect(firstPoint.length).toBe(2);
            expectValidNumber(firstPoint[0]);
            expectValidNumber(firstPoint[1]);
          }
        }
      }
    });
  });

});

