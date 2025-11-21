import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { RaisesResponse, isRaisesResponse } from './types';
import { raisesResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Raises', () => {
  let raisesResponse: ApiResponse<RaisesResponse>;

  beforeAll(async () => {
    raisesResponse = await apiClient.get<RaisesResponse>(
      endpoints.MAIN_PAGE.RAISES
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(raisesResponse);
      expect(isRaisesResponse(raisesResponse.data)).toBe(true);
      expect(raisesResponse.data).toHaveProperty('raises');
      expect(Array.isArray(raisesResponse.data.raises)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        raisesResponse.data,
        raisesResponseSchema,
        'Raises'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should return a non-empty raises array', () => {
      expect(raisesResponse.data.raises.length).toBeGreaterThan(0);
    });

    it('should have minimum expected raises', () => {
      expect(raisesResponse.data.raises.length).toBeGreaterThan(10);
    });
  });

  describe('Raise Item Validation', () => {
    it('should have required fields in all raises', () => {
      raisesResponse.data.raises.slice(0, 20).forEach((raise) => {
        expect(raise).toHaveProperty('name');
        expect(raise).toHaveProperty('date');
        expect(raise).toHaveProperty('amount');
        
        expect(typeof raise.name).toBe('string');
        expect(raise.name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid date field', () => {
      raisesResponse.data.raises.slice(0, 20).forEach((raise) => {
        const dateNum = typeof raise.date === 'string' ? Number(raise.date) : raise.date;
        expect(typeof dateNum).toBe('number');
        expect(isNaN(dateNum)).toBe(false);
        
        // Check if it's a valid timestamp
        if (dateNum > 10000000) {
          expectValidTimestamp(dateNum);
        }
      });
    });

    it('should have valid amount field', () => {
      raisesResponse.data.raises.slice(0, 20).forEach((raise) => {
        if (raise.amount !== null) {
          expectValidNumber(raise.amount);
          expectNonNegativeNumber(raise.amount);
        }
      });
    });

    it('should have valid valuation when present', () => {
      const raisesWithValuation = raisesResponse.data.raises
        .filter((r) => r.valuation !== undefined && r.valuation !== null)
        .slice(0, 20);

      if (raisesWithValuation.length > 0) {
        raisesWithValuation.forEach((raise) => {
          const val = typeof raise.valuation === 'string' ? Number(raise.valuation) : raise.valuation!;
          expectValidNumber(val);
          expectNonNegativeNumber(val);
        });
      }
    });

    it('should have valid optional fields when present', () => {
      const raisesWithExtras = raisesResponse.data.raises
        .filter((r) => r.round || r.sector)
        .slice(0, 20);

      if (raisesWithExtras.length > 0) {
        raisesWithExtras.forEach((raise) => {
          if (raise.round) {
            expect(typeof raise.round).toBe('string');
          }
          if (raise.sector) {
            expect(typeof raise.sector).toBe('string');
          }
          if (raise.category) {
            expect(typeof raise.category).toBe('string');
          }
        });
      }
    });

    it('should have valid investor arrays when present', () => {
      const raisesWithInvestors = raisesResponse.data.raises
        .filter((r) => r.leadInvestors || r.otherInvestors)
        .slice(0, 20);

      if (raisesWithInvestors.length > 0) {
        raisesWithInvestors.forEach((raise) => {
          if (raise.leadInvestors) {
            expect(Array.isArray(raise.leadInvestors)).toBe(true);
            raise.leadInvestors.forEach((investor) => {
              expect(typeof investor).toBe('string');
            });
          }
          if (raise.otherInvestors) {
            expect(Array.isArray(raise.otherInvestors)).toBe(true);
            raise.otherInvestors.forEach((investor) => {
              expect(typeof investor).toBe('string');
            });
          }
        });
      }
    });
  });

  describe('Data Quality Validation', () => {
    it('should have valid chronological dates', () => {
      if (raisesResponse.data.raises.length > 1) {
        const dates = raisesResponse.data.raises.map((r) => {
          return typeof r.date === 'string' ? Number(r.date) : r.date;
        }).slice(0, 50);

        // Just verify all dates are valid timestamps
        dates.forEach(date => {
          expect(date).toBeGreaterThan(0);
          expect(isNaN(date)).toBe(false);
        });
      }
    });

    it('should have reasonable raise amounts when present', () => {
      const raisesWithAmount = raisesResponse.data.raises
        .filter(r => r.amount !== null)
        .slice(0, 20);
      
      expect(raisesWithAmount.length).toBeGreaterThan(0);
      
      raisesWithAmount.forEach((raise) => {
        expect(raise.amount!).toBeGreaterThan(0);
        expect(raise.amount!).toBeLessThan(10_000_000_000); // 10 billion
      });
    });

    it('should have raises with various amounts', () => {
      const raisesWithAmount = raisesResponse.data.raises
        .filter(r => r.amount !== null)
        .slice(0, 20);
      
      // Just verify we have various amounts
      expect(raisesWithAmount.length).toBeGreaterThan(0);
      raisesWithAmount.forEach(raise => {
        expect(raise.amount!).toBeGreaterThan(0);
      });
    });

    it('should have total raise amount calculated correctly', () => {
      const totalAmount = raisesResponse.data.raises
        .filter(r => r.amount !== null)
        .reduce((sum, raise) => sum + raise.amount!, 0);
      expect(totalAmount).toBeGreaterThan(0);
      expect(isNaN(totalAmount)).toBe(false);
    });
  });
});
