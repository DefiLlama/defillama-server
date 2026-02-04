import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { OraclesResponse, isOraclesResponse } from './types';
import { oraclesResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Oracles', () => {
  let oraclesResponse: ApiResponse<OraclesResponse>;

  beforeAll(async () => {
    oraclesResponse = await apiClient.get<OraclesResponse>(
      endpoints.MAIN_PAGE.ORACLES
    );
  }, 120000); // 120s timeout for large 39MB response

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(oraclesResponse);
      expect(isOraclesResponse(oraclesResponse.data)).toBe(true);
      expect(oraclesResponse.data).toHaveProperty('oracles');
      expect(typeof oraclesResponse.data.oracles).toBe('object');
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        oraclesResponse.data,
        oraclesResponseSchema,
        'Oracles'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have non-empty oracles object', () => {
      const oracleKeys = Object.keys(oraclesResponse.data.oracles);
      expect(oracleKeys.length).toBeGreaterThan(0);
    });

    it('should have minimum expected oracles', () => {
      const oracleKeys = Object.keys(oraclesResponse.data.oracles);
      expect(oracleKeys.length).toBeGreaterThan(5);
    });
  });

  describe('Oracle Data Validation', () => {
    it('should have valid oracle names as keys', () => {
      const oracleKeys = Object.keys(oraclesResponse.data.oracles);
      
      oracleKeys.slice(0, 20).forEach((oracleName) => {
        expect(typeof oracleName).toBe('string');
        expect(oracleName.length).toBeGreaterThan(0);
      });
    });

    it('should have well-known oracles', () => {
      const oracleKeys = Object.keys(oraclesResponse.data.oracles).map(k => k.toLowerCase());
      const wellKnownOracles = ['chainlink'];
      
      const foundOracles = wellKnownOracles.filter((name) =>
        oracleKeys.some((oName) => oName.toLowerCase().includes(name))
      );

      expect(foundOracles.length).toBeGreaterThan(0);
    });

    it('should have various oracle data types', () => {
      const oracles = oraclesResponse.data.oracles;
      const oracleKeys = Object.keys(oracles);

      if (oracleKeys.length > 0) {
        oracleKeys.slice(0, 10).forEach((oracleName) => {
          const oracleData = oracles[oracleName];
          expect(oracleData).toBeDefined();
        });
      }
    });
  });

  describe('Additional Fields Validation', () => {
    it('should have chart data when present', () => {
      if (oraclesResponse.data.chart) {
        const chart = oraclesResponse.data.chart;
        expect(typeof chart).toBe('object');
        
        const timestamps = Object.keys(chart);
        if (timestamps.length > 0) {
          timestamps.slice(0, 5).forEach((timestamp) => {
            const ts = Number(timestamp);
            expect(isNaN(ts)).toBe(false);
          });
        }
      }
    });

    it('should have oraclesTVS when present', () => {
      if (oraclesResponse.data.oraclesTVS !== undefined) {
        expect(oraclesResponse.data.oraclesTVS).toBeDefined();
      }
    });

    it('should have chainsByOracle when present', () => {
      if (oraclesResponse.data.chainsByOracle) {
        const chainsByOracle = oraclesResponse.data.chainsByOracle;
        expect(typeof chainsByOracle).toBe('object');
        
        const oracleKeys = Object.keys(chainsByOracle);
        if (oracleKeys.length > 0) {
          expect(oracleKeys.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have chainChart when present', () => {
      if (oraclesResponse.data.chainChart) {
        const chainChart = oraclesResponse.data.chainChart;
        expect(typeof chainChart).toBe('object');
      }
    });
  });
});
