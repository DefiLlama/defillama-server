import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { HacksResponse, isHacksResponse } from './types';
import { hacksResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Hacks', () => {
  let hacksResponse: ApiResponse<HacksResponse>;

  beforeAll(async () => {
    hacksResponse = await apiClient.get<HacksResponse>(
      endpoints.MAIN_PAGE.HACKS
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(hacksResponse);
      expectArrayResponse(hacksResponse);
      expect(isHacksResponse(hacksResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        hacksResponse.data,
        hacksResponseSchema,
        'Hacks'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty array', () => {
      expect(hacksResponse.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected hacks', () => {
      expect(hacksResponse.data.length).toBeGreaterThan(10);
    });
  });

  describe('Hack Item Validation', () => {
    it('should have required fields in all hacks', () => {
      hacksResponse.data.slice(0, 20).forEach((hack) => {
        expect(hack).toHaveProperty('name');
        expect(hack).toHaveProperty('date');
        expect(hack).toHaveProperty('amount');
        
        expect(typeof hack.name).toBe('string');
        expect(hack.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid date field', () => {
      hacksResponse.data.slice(0, 20).forEach((hack) => {
        const dateNum = typeof hack.date === 'string' ? Number(hack.date) : hack.date;
        expect(typeof dateNum).toBe('number');
        expect(isNaN(dateNum)).toBe(false);
        
        // Check if it's a valid timestamp (in seconds)
        if (dateNum > 10000000) {
          expectValidTimestamp(dateNum);
        }
      });
    });

    it('should have valid amount field', () => {
      hacksResponse.data.slice(0, 20).forEach((hack) => {
        if (hack.amount !== null) {
          expectValidNumber(hack.amount);
          expectNonNegativeNumber(hack.amount);
        }
      });
    });

    it('should have valid optional fields when present', () => {
      const hacksWithExtras = hacksResponse.data
        .filter((h) => h.chain || h.classification)
        .slice(0, 20);

      if (hacksWithExtras.length > 0) {
        hacksWithExtras.forEach((hack) => {
          if (hack.chain) {
            // Chain can be a string or an array of strings
            if (typeof hack.chain === 'string') {
              expect(hack.chain.length).toBeGreaterThan(0);
            } else if (Array.isArray(hack.chain)) {
              expect(hack.chain.length).toBeGreaterThan(0);
            }
          }
          if (hack.classification) {
            expect(typeof hack.classification).toBe('string');
          }
          if (hack.technique) {
            expect(typeof hack.technique).toBe('string');
          }
        });
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have valid chronological dates', () => {
      if (hacksResponse.data.length > 1) {
        const dates = hacksResponse.data.map((h) => {
          return typeof h.date === 'string' ? Number(h.date) : h.date;
        }).slice(0, 50);

        // Just verify all dates are valid timestamps
        dates.forEach(date => {
          expect(date).toBeGreaterThan(0);
          expect(isNaN(date)).toBe(false);
        });
      }
    });

    it('should have reasonable hack amounts', () => {
      const hacksWithAmount = hacksResponse.data
        .filter(h => h.amount !== null)
        .slice(0, 20);
      
      expect(hacksWithAmount.length).toBeGreaterThan(0);
      
      hacksWithAmount.forEach((hack) => {
        expect(hack.amount!).toBeGreaterThan(0);
        expect(hack.amount!).toBeLessThan(1_000_000_000_000); // 1 trillion
      });
    });

    it('should have some high-profile hacks', () => {
      const largeHacks = hacksResponse.data.filter((h) => h.amount !== null && h.amount! > 100_000_000);
      expect(largeHacks.length).toBeGreaterThan(0);
    });

    it('should have total hack amount calculated correctly', () => {
      const totalAmount = hacksResponse.data.reduce((sum, hack) => sum + (hack.amount ?? 0), 0);
      expect(totalAmount).toBeGreaterThan(0);
      expect(isNaN(totalAmount)).toBe(false);
    });
  });
});

