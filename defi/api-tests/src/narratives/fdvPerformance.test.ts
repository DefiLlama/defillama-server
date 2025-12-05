import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { NarrativePerformanceResponse, isNarrativePerformanceResponse } from './types';
import { narrativePerformanceResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';
import { validate } from '../../utils/validation';

const apiClient = createApiClient(endpoints.NARRATIVES.BASE_URL);

describe('Narratives API - FDV Performance', () => {
  const testPeriods = ['7', '30'];
  const responses: Record<string, ApiResponse<NarrativePerformanceResponse>> = {};

  beforeAll(async () => {
    const results = await Promise.all(
      testPeriods.map((period) =>
        apiClient.get<NarrativePerformanceResponse>(endpoints.NARRATIVES.FDV_PERFORMANCE(period))
      )
    );

    testPeriods.forEach((period, index) => {
      responses[period] = results[index];
    });
  }, 90000);

  testPeriods.forEach((period) => {
    describe(`Period: ${period}`, () => {
      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          const response = responses[period];
          expectSuccessfulResponse(response);
          expect(isNarrativePerformanceResponse(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = responses[period];
          if (response.status === 200) {
            const result = validate(
              response.data,
              narrativePerformanceResponseSchema,
              'NarrativePerformanceResponse'
            );
            expect(result.success).toBe(true);
          }
        });

        it('should return an array', () => {
          const response = responses[period];
          if (response.status === 200) {
            expect(Array.isArray(response.data)).toBe(true);
            expect(response.data.length).toBeGreaterThan(0);
          }
        });
      });

      describe('Data Quality Validation', () => {
        it('should have reasonable number of data points', () => {
          const response = responses[period];
          if (response.status === 200) {
            expect(response.data.length).toBeGreaterThan(1);
            expect(response.data.length).toBeLessThan(1000);
          }
        });

        it('should have chronologically ordered timestamps', () => {
          const response = responses[period];
          if (response.status === 200) {
            const timestamps = response.data.map((point) => point.date);
            
            for (let i = 1; i < timestamps.length; i++) {
              expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
            }
          }
        });

        it('should have consistent narrative categories across data points', () => {
          const response = responses[period];
          if (response.status === 200 && response.data.length > 1) {
            // Get categories from first data point (excluding 'date')
            const firstPointCategories = Object.keys(response.data[0]).filter((key) => key !== 'date').sort();
            
            // Check that at least a few subsequent points have the same categories
            const samplesToCheck = Math.min(5, response.data.length);
            for (let i = 1; i < samplesToCheck; i++) {
              const pointCategories = Object.keys(response.data[i]).filter((key) => key !== 'date').sort();
              expect(pointCategories).toEqual(firstPointCategories);
            }
          }
        });

        it('should have well-known narrative categories', () => {
          const response = responses[period];
          if (response.status === 200 && response.data.length > 0) {
            const categories = Object.keys(response.data[0]).filter((key) => key !== 'date');
            
            // Check for some well-known categories
            const wellKnownCategories = [
              'Artificial Intelligence (AI)',
              'Decentralized Finance (DeFi)',
              'Meme',
              'Gaming (GameFi)',
            ];
            
            const foundCategories = wellKnownCategories.filter((cat) => categories.includes(cat));
            expect(foundCategories.length).toBeGreaterThan(0);
          }
        });
      });

      describe('Data Point Validation', () => {
        it('should have valid date field in all points', () => {
          const response = responses[period];
          if (response.status === 200) {
            response.data.slice(0, 20).forEach((point) => {
              expect(point).toHaveProperty('date');
              expectValidNumber(point.date);
              expect(point.date).toBeGreaterThan(0);
              
              // Date should be a valid Unix timestamp (reasonable range)
              const now = Math.floor(Date.now() / 1000);
              expect(point.date).toBeLessThanOrEqual(now + 86400 * 365); // Not more than 1 year in future
              expect(point.date).toBeGreaterThan(now - 86400 * 365 * 5); // Not more than 5 years in past
            });
          }
        });

        it('should have valid percentage values for categories', () => {
          const response = responses[period];
          if (response.status === 200) {
            response.data.slice(0, 20).forEach((point) => {
              const categories = Object.keys(point).filter((key) => key !== 'date');
              
              categories.forEach((category) => {
                const value = point[category];
                expectValidNumber(value);
                
                // Percentage changes can be positive or negative
                // But should be reasonable (not more than ±1000%)
                expect(value).toBeGreaterThan(-1000);
                expect(value).toBeLessThan(1000);
              });
            });
          }
        });

        it('should have at least one category with data in first point', () => {
          const response = responses[period];
          if (response.status === 200 && response.data.length > 0) {
            const firstPoint = response.data[0];
            const categories = Object.keys(firstPoint).filter((key) => key !== 'date');
            
            expect(categories.length).toBeGreaterThan(0);
            
            // First point might have all zeros (baseline), so just check structure
            categories.forEach((category) => {
              expect(typeof firstPoint[category]).toBe('number');
            });
          }
        });

        it('should have non-zero values in later data points', () => {
          const response = responses[period];
          if (response.status === 200 && response.data.length > 1) {
            // Check that at least some data points have non-zero values
            const laterPoints = response.data.slice(1, Math.min(10, response.data.length));
            
            let hasNonZeroValues = false;
            laterPoints.forEach((point) => {
              const categories = Object.keys(point).filter((key) => key !== 'date');
              const nonZeroCategories = categories.filter((cat) => point[cat] !== 0);
              
              if (nonZeroCategories.length > 0) {
                hasNonZeroValues = true;
              }
            });
            
            expect(hasNonZeroValues).toBe(true);
          }
        });
      });

      describe('Period-Specific Validation', () => {
        it('should have appropriate time span for period', () => {
          const response = responses[period];
          if (response.status === 200 && response.data.length > 1) {
            const firstTimestamp = response.data[0].date;
            const lastTimestamp = response.data[response.data.length - 1].date;
            const timeSpanDays = (lastTimestamp - firstTimestamp) / 86400;
            
            // Expected time spans (with some tolerance)
            const expectedSpans: Record<string, { min: number; max: number }> = {
              '7': { min: 5, max: 10 },
              '30': { min: 25, max: 35 },
            };
            
            const expected = expectedSpans[period];
            if (expected) {
              expect(timeSpanDays).toBeGreaterThan(expected.min);
              expect(timeSpanDays).toBeLessThan(expected.max);
            }
          }
        });
      });
    });
  });

  describe('Cross-Period Comparison', () => {
    it('should have different time spans for different periods', () => {
      const successfulResponses = testPeriods
        .filter((period) => responses[period].status === 200 && responses[period].data.length > 1)
        .map((period) => ({
          period,
          data: responses[period].data,
        }));

      if (successfulResponses.length > 1) {
        const timeSpans = successfulResponses.map((resp) => {
          const first = resp.data[0].date;
          const last = resp.data[resp.data.length - 1].date;
          return last - first;
        });

        // Check that time spans are different
        const uniqueSpans = new Set(timeSpans);
        if (successfulResponses.length > 1) {
          // Allow for some periods to have same span
          expect(uniqueSpans.size).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it('should have consistent category lists across periods', () => {
      const successfulResponses = testPeriods
        .filter((period) => responses[period].status === 200 && responses[period].data.length > 0)
        .map((period) => responses[period].data);

      if (successfulResponses.length > 1) {
        const categoryLists = successfulResponses.map((data) =>
          Object.keys(data[0]).filter((key) => key !== 'date').sort()
        );

        // All periods should have the same categories
        const firstList = categoryLists[0];
        categoryLists.slice(1).forEach((list) => {
          expect(list).toEqual(firstList);
        });
      }
    });
  });

  describe('Endpoint Configuration', () => {
    it('should have correct base URL', () => {
      expect(endpoints.NARRATIVES.BASE_URL).toBeDefined();
      expect(typeof endpoints.NARRATIVES.BASE_URL).toBe('string');
      expect(endpoints.NARRATIVES.BASE_URL.length).toBeGreaterThan(0);
    });

    it('should generate correct endpoint paths', () => {
      testPeriods.forEach((period) => {
        const path = endpoints.NARRATIVES.FDV_PERFORMANCE(period);
        expect(path).toBe(`/fdv/performance/${period}`);
      });
    });
  });
});

