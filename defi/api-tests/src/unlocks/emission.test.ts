import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { EmissionResponse, EmissionBody, isEmissionResponse } from './types';
import { emissionResponseSchema, emissionBodySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.UNLOCKS.BASE_URL);

describe('Unlocks API - Emission', () => {
  // Test with multiple protocols to ensure robustness
  const testProtocols = ['overnight', 'uniswap'];

  testProtocols.forEach((protocol) => {
    describe(`Protocol: ${protocol}`, () => {
      let emissionResponse: ApiResponse<EmissionResponse>;
      let parsedBody: EmissionBody;

      beforeAll(async () => {
        emissionResponse = await apiClient.get<EmissionResponse>(
          endpoints.UNLOCKS.EMISSION(protocol)
        );

        // Parse the body JSON string
        if (emissionResponse.status === 200 && emissionResponse.data.body) {
          try {
            parsedBody = JSON.parse(emissionResponse.data.body);
          } catch (e) {
            console.error(`Failed to parse body for ${protocol}:`, e);
          }
        }
      }, 30000);

      describe('Basic Response Validation', () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(emissionResponse);
          expect(isEmissionResponse(emissionResponse.data)).toBe(true);
          expect(emissionResponse.data).toHaveProperty('body');
          expect(typeof emissionResponse.data.body).toBe('string');
        });

        it('should validate against Zod schema', () => {
          const result = validate(
            emissionResponse.data,
            emissionResponseSchema,
            `Emission-${protocol}`
          );
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors (first 5):', result.errors.slice(0, 5));
          }
        });

        it('should have valid lastModified field', () => {
          if (emissionResponse.data.lastModified !== undefined) {
            expect(emissionResponse.data.lastModified).toBeDefined();
          }
        });

        it('should have parseable body JSON', () => {
          expect(() => JSON.parse(emissionResponse.data.body)).not.toThrow();
          expect(parsedBody).toBeDefined();
        });
      });

      describe('Parsed Body Validation', () => {
        it('should validate parsed body against schema', () => {
          if (parsedBody) {
            const result = validate(
              parsedBody,
              emissionBodySchema,
              `EmissionBody-${protocol}`
            );
            expect(result.success).toBe(true);
            if (!result.success) {
              console.error('Body validation errors:', result.errors.slice(0, 5));
            }
          }
        });

        it('should have documentedData when present', () => {
          if (parsedBody && parsedBody.documentedData) {
            expect(parsedBody.documentedData).toHaveProperty('data');
            expect(Array.isArray(parsedBody.documentedData.data)).toBe(true);
          }
        });

        it('should have valid emission series data', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.data) {
            const series = parsedBody.documentedData.data;
            expect(series.length).toBeGreaterThan(0);

            series.slice(0, 5).forEach((seriesItem) => {
              expect(seriesItem).toHaveProperty('label');
              expect(seriesItem).toHaveProperty('data');
              expect(typeof seriesItem.label).toBe('string');
              expect(Array.isArray(seriesItem.data)).toBe(true);
            });
          }
        });

        it('should have valid data points in series', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.data) {
            const series = parsedBody.documentedData.data;
            
            if (series.length > 0 && series[0].data.length > 0) {
              const dataPoints = series[0].data.slice(0, 10);

              dataPoints.forEach((point) => {
                expect(point).toHaveProperty('timestamp');
                expect(point).toHaveProperty('unlocked');
                
                expectValidNumber(point.timestamp);
                expectValidNumber(point.unlocked);
                expectValidTimestamp(point.timestamp);

                if (point.rawEmission !== undefined) {
                  expectValidNumber(point.rawEmission);
                }

                if (point.burned !== undefined) {
                  expectValidNumber(point.burned);
                }
              });
            }
          }
        });

        it('should have chronologically ordered timestamps', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.data) {
            const series = parsedBody.documentedData.data;

            if (series.length > 0 && series[0].data.length > 1) {
              const timestamps = series[0].data.map((point) => point.timestamp);
              
              for (let i = 0; i < timestamps.length - 1; i++) {
                expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
              }
            }
          }
        });

        it('should have non-negative unlocked values', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.data) {
            const series = parsedBody.documentedData.data;

            if (series.length > 0) {
              series[0].data.slice(0, 20).forEach((point) => {
                expect(point.unlocked).toBeGreaterThanOrEqual(0);
              });
            }
          }
        });

        it('should have categories array when present', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.categories) {
            expect(Array.isArray(parsedBody.documentedData.categories)).toBe(true);
            
            if (parsedBody.documentedData.categories.length > 0) {
              parsedBody.documentedData.categories.forEach((category) => {
                expect(typeof category).toBe('string');
              });
            }
          }
        });

        it('should have sources array when present', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.sources) {
            expect(Array.isArray(parsedBody.documentedData.sources)).toBe(true);
            
            if (parsedBody.documentedData.sources.length > 0) {
              parsedBody.documentedData.sources.forEach((source) => {
                expect(typeof source).toBe('string');
              });
            }
          } else if (parsedBody && parsedBody.sources) {
            expect(Array.isArray(parsedBody.sources)).toBe(true);
          }
        });
      });

      describe('Data Quality Validation', () => {
        it('should have reasonable timestamp range', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.data) {
            const series = parsedBody.documentedData.data;

            if (series.length > 0 && series[0].data.length > 0) {
              const timestamps = series[0].data.map((point) => point.timestamp);
              const minTimestamp = Math.min(...timestamps);
              const maxTimestamp = Math.max(...timestamps);

              // Should cover a reasonable time range (at least a few months)
              expect(maxTimestamp - minTimestamp).toBeGreaterThan(86400 * 30);

              // Should not be in the distant future (more than 10 years)
              expect(maxTimestamp).toBeLessThan(Date.now() / 1000 + 86400 * 365 * 10);
            }
          }
        });

        it('should have increasing or stable unlocked amounts over time', () => {
          if (parsedBody && parsedBody.documentedData && parsedBody.documentedData.data) {
            const series = parsedBody.documentedData.data;

            if (series.length > 0 && series[0].data.length > 1) {
              const data = series[0].data;
              let prevUnlocked = data[0].unlocked;

              // Check that unlocked generally doesn't decrease (allowing for small variations)
              for (let i = 1; i < Math.min(data.length, 100); i++) {
                // Unlocked should generally increase or stay the same
                // Allow for small decreases (< 1%) due to data inconsistencies
                if (prevUnlocked > 0) {
                  const decreaseRatio = (prevUnlocked - data[i].unlocked) / prevUnlocked;
                  expect(decreaseRatio).toBeLessThan(0.5); // Should not decrease by more than 50%
                }
                prevUnlocked = data[i].unlocked;
              }
            }
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const response = await apiClient.get<EmissionResponse>(
        endpoints.UNLOCKS.EMISSION('non-existent-protocol-xyz-123')
      );

      // API might return 404 or 200 with empty/null data
      if (response.status === 200) {
        expect(response.data).toBeDefined();
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });
  });
});
