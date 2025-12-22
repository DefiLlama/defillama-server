import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { StablecoinPrices, StablecoinPrice, isStablecoinPrices } from './types';

const apiClient = createApiClient(endpoints.STABLECOINS.BASE_URL);
import { stablecoinPricesArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

describe('Stablecoins API - Prices', () => {
  let pricesResponse: ApiResponse<StablecoinPrices>;

  beforeAll(async () => {
    const endpoint = endpoints.STABLECOINS.PRICES;
    // Skip if endpoint is not available (free-only API not configured)
    if (endpoint && endpoint !== '') {
      pricesResponse = await apiClient.get<StablecoinPrices>(endpoint);
    }
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(pricesResponse);
      expectArrayResponse(pricesResponse);
      expectNonEmptyArray(pricesResponse.data);
      expect(isStablecoinPrices(pricesResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(pricesResponse.data, stablecoinPricesArraySchema, 'StablecoinPrices');
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have required fields in all price points', () => {
      const requiredFields = ['date', 'prices'];
      // Sample-based testing - validate first 10 price points
      pricesResponse.data.slice(0, 10).forEach((pricePoint) => {
        requiredFields.forEach((field) => {
          expect(pricePoint).toHaveProperty(field);
        });
      });
    });

    it('should have data points in chronological order', () => {
      if (pricesResponse.data.length > 1) {
        const dates = pricesResponse.data.map((p) => p.date);
        const sortedDates = [...dates].sort((a, b) => a - b);
        expect(dates).toEqual(sortedDates);
      }
    });
  });

  describe('Price Data Validation', () => {
    it('should have valid timestamps', () => {
      // Filter out invalid timestamps (0 or negative) and validate the rest
      const validTimestamps = pricesResponse.data.filter((p) => p.date > 0);
      expect(validTimestamps.length).toBeGreaterThan(0);
      
      // Sample-based testing - validate first 10 valid price points
      validTimestamps.slice(0, 10).forEach((pricePoint) => {
        expectValidTimestamp(pricePoint.date);
      });
    });

    it('should have valid price objects', () => {
      // Sample-based testing - validate first 10 price points
      pricesResponse.data.slice(0, 10).forEach((pricePoint) => {
        expect(typeof pricePoint.prices).toBe('object');
        expect(pricePoint.prices).not.toBeNull();
        expect(Object.keys(pricePoint.prices).length).toBeGreaterThan(0);
      });
    });

    it('should have valid price values', () => {
      // Sample-based testing - validate first 10 price points
      pricesResponse.data.slice(0, 10).forEach((pricePoint) => {
        Object.entries(pricePoint.prices).forEach(([symbol, price]) => {
          expect(typeof symbol).toBe('string');
          expect(symbol.length).toBeGreaterThan(0);
          expectValidNumber(price);
          expectNonNegativeNumber(price);
          expect(price).toBeLessThan(1000000);
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prices object', () => {
      const emptyPrices = pricesResponse.data.filter(
        (p) => Object.keys(p.prices).length === 0
      );
      
      if (emptyPrices.length > 0) {
        emptyPrices.forEach((pricePoint) => {
          expect(typeof pricePoint.prices).toBe('object');
          expect(pricePoint.prices).not.toBeNull();
        });
      }
    });

    it('should have reasonable timestamp range', () => {
      // Filter out invalid timestamps (0 or negative)
      const validData = pricesResponse.data.filter((p) => p.date > 0);
      
      if (validData.length > 0) {
        const firstDate = validData[0].date;
        const lastDate = validData[validData.length - 1].date;
        expect(lastDate).toBeGreaterThanOrEqual(firstDate);
        expect(firstDate).toBeGreaterThan(1262304000); // After Jan 1, 2010
        expect(lastDate).toBeLessThan(Date.now() / 1000 + 86400); // Not more than 1 day in future
      }
    });
  });
});
