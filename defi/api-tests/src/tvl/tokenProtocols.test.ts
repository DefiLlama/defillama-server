import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { TokenProtocols, isTokenProtocols } from './types';
import { tokenProtocolsArraySchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.TVL.BASE_URL);
const TVL_ENDPOINTS = endpoints.TVL;

describe('TVL API - Token Protocols', () => {
  // Configure test symbols - keep just one for speed, add more for thoroughness
  const testSymbols = ['USDC'];
  // const testSymbols = ['USDC', 'USDT', 'ETH', 'BTC', 'DAI'];
  const symbolResponses: Record<string, ApiResponse<TokenProtocols>> = {};

  beforeAll(async () => {
    // Fetch all test symbols in parallel once
    await Promise.all(
      testSymbols.map(async (symbol) => {
        symbolResponses[symbol] = await apiClient.get<TokenProtocols>(
          TVL_ENDPOINTS.TOKEN_PROTOCOLS(symbol)
        );
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testSymbols.forEach((symbol) => {
      describe(`Symbol: ${symbol}`, () => {
        it('should return successful response with valid structure', () => {
          const response = symbolResponses[symbol];
          expectSuccessfulResponse(response);
          expectArrayResponse(response);
          expect(isTokenProtocols(response.data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const response = symbolResponses[symbol];
          const result = validate(response.data, tokenProtocolsArraySchema, `TokenProtocols-${symbol}`);
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors);
          }
        });

        it('should have required fields in all protocols', () => {
          const response = symbolResponses[symbol];
          if (response.data.length > 0) {
            const requiredFields = ['name', 'category', 'amountUsd', 'misrepresentedTokens'];
            // Sample-based testing - validate first 10 protocols
            response.data.slice(0, 10).forEach((protocol) => {
              requiredFields.forEach((field) => {
                expect(protocol).toHaveProperty(field);
              });
            });
          }
        });

        it('should have valid protocol properties', () => {
          const response = symbolResponses[symbol];
          if (response.data.length > 0) {
            // Sample-based testing - validate first 10 protocols
            response.data.slice(0, 10).forEach((protocol) => {
              expectNonEmptyString(protocol.name);
              expect(typeof protocol.category).toBe('string');
              expect(typeof protocol.amountUsd).toBe('object');
              expect(protocol.amountUsd).not.toBeNull();
              expect(typeof protocol.misrepresentedTokens).toBe('boolean');
            });
          }
        });
      });
    });
  });

  describe('Token Amount Data Validation', () => {
    testSymbols.forEach((symbol) => {
      describe(`Symbol: ${symbol}`, () => {
        it('should have valid amountUsd values', () => {
          const response = symbolResponses[symbol];
          if (response.data.length > 0) {
            // Sample-based testing - validate first 10 protocols
            response.data.slice(0, 10).forEach((protocol) => {
              Object.entries(protocol.amountUsd).forEach(([token, amount]) => {
                expectNonEmptyString(token);
                expectValidNumber(amount);
                // Amount can be negative for debt protocols (VARIABLEDEBT*, etc.)
                expect(Math.abs(amount)).toBeLessThan(10_000_000_000_000); // Max reasonable absolute amount
              });
            });
          }
        });

        it('should have token symbols matching the query symbol', () => {
          const response = symbolResponses[symbol];
          if (response.data.length > 0) {
            // Sample-based testing - validate first 10 protocols
            response.data.slice(0, 10).forEach((protocol) => {
              const tokenKeys = Object.keys(protocol.amountUsd);
              expect(tokenKeys.length).toBeGreaterThan(0);
              // Token keys should contain the queried symbol
              tokenKeys.forEach((token) => {
                expect(token.toUpperCase()).toContain(symbol.toUpperCase());
              });
            });
          }
        });

        it('should have non-empty amountUsd objects', () => {
          const response = symbolResponses[symbol];
          if (response.data.length > 0) {
            response.data.forEach((protocol) => {
              expect(Object.keys(protocol.amountUsd).length).toBeGreaterThan(0);
            });
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent token symbol gracefully', async () => {
      const response = await apiClient.get<TokenProtocols>(
        TVL_ENDPOINTS.TOKEN_PROTOCOLS('NONEXISTENTTOKENXYZ123')
      );

      // API may return 200 with empty array or 4xx status
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBe(0);
      } else {
        expect(response.status).toBeGreaterThanOrEqual(400);
      }
    });

    it('should handle protocols with misrepresentedTokens flag', () => {
      // Use first test symbol
      const response = symbolResponses[testSymbols[0]];

      if (response.data.length > 0) {
        const withMisrepresented = response.data.filter((p) => p.misrepresentedTokens === true);
        const withoutMisrepresented = response.data.filter((p) => p.misrepresentedTokens === false);

        // Verify all protocols have the boolean flag
        response.data.forEach((protocol) => {
          expect(typeof protocol.misrepresentedTokens).toBe('boolean');
        });

        // If there are misrepresented tokens, verify structure
        if (withMisrepresented.length > 0) {
          withMisrepresented.slice(0, 5).forEach((protocol) => {
            expect(protocol.misrepresentedTokens).toBe(true);
            expectNonEmptyString(protocol.name);
          });
        }
      }
    });

    it('should have valid categories', () => {
      // Use first test symbol
      const response = symbolResponses[testSymbols[0]];

      if (response.data.length > 0) {
        const categories = new Set(response.data.map((p) => p.category));
        expect(categories.size).toBeGreaterThan(0);

        // Sample-based testing - validate first 10 protocols
        response.data.slice(0, 10).forEach((protocol) => {
          expect(typeof protocol.category).toBe('string');
          expectNonEmptyString(protocol.category);
        });
      }
    });
  });
});

