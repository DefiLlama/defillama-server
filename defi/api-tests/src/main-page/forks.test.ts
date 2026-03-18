import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ForksResponse, isForksResponse } from './types';
import { forksResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Forks', () => {
  let forksResponse: ApiResponse<ForksResponse>;

  beforeAll(async () => {
    forksResponse = await apiClient.get<ForksResponse>(
      endpoints.MAIN_PAGE.FORKS
    );
  }, 90000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(forksResponse);
      expect(isForksResponse(forksResponse.data)).toBe(true);
      expect(forksResponse.data).toHaveProperty('forks');
      expect(forksResponse.data).toHaveProperty('chart');
      expect(typeof forksResponse.data.forks).toBe('object');
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        forksResponse.data,
        forksResponseSchema,
        'Forks'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have non-empty forks object', () => {
      const forkKeys = Object.keys(forksResponse.data.forks);
      expect(forkKeys.length).toBeGreaterThan(0);
    });

    it('should have minimum expected forks', () => {
      const forkKeys = Object.keys(forksResponse.data.forks);
      expect(forkKeys.length).toBeGreaterThan(5);
    });
  });

  describe('Fork Data Validation', () => {
    it('should have valid fork names as keys', () => {
      const forkKeys = Object.keys(forksResponse.data.forks);
      
      forkKeys.slice(0, 20).forEach((forkName) => {
        expect(typeof forkName).toBe('string');
        expect(forkName.length).toBeGreaterThan(0);
      });
    });

    it('should have well-known forks', () => {
      const forkKeys = Object.keys(forksResponse.data.forks).map(k => k.toLowerCase());
      const wellKnownForks = ['uniswap', 'compound', 'aave'];
      
      const foundForks = wellKnownForks.filter((name) =>
        forkKeys.some((fName) => fName.toLowerCase().includes(name))
      );

      expect(foundForks.length).toBeGreaterThan(0);
    });

    it('should have various fork data types', () => {
      const forks = forksResponse.data.forks;
      const forkKeys = Object.keys(forks);

      if (forkKeys.length > 0) {
        forkKeys.slice(0, 10).forEach((forkName) => {
          const forkData = forks[forkName];
          expect(forkData).toBeDefined();
        });
      }
    });
  });

  describe('Chart Data Validation', () => {
    it('should have chart data with timestamps', () => {
      const chart = forksResponse.data.chart;
      const timestamps = Object.keys(chart);

      expect(timestamps.length).toBeGreaterThan(0);
      
      timestamps.slice(0, 10).forEach((timestamp) => {
        const ts = Number(timestamp);
        expect(isNaN(ts)).toBe(false);
        expect(ts).toBeGreaterThan(0);
      });
    });

    it('should have fork data in chart entries', () => {
      const chart = forksResponse.data.chart;
      const timestamps = Object.keys(chart);

      if (timestamps.length > 0) {
        const firstTimestamp = timestamps[0];
        const forkData = chart[firstTimestamp];
        
        expect(typeof forkData).toBe('object');
        
        const forkKeys = Object.keys(forkData);
        expect(forkKeys.length).toBeGreaterThan(0);
      }
    });

    it('should have chronologically ordered timestamps', () => {
      const timestamps = Object.keys(forksResponse.data.chart).map(Number);
      
      if (timestamps.length > 1) {
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).toEqual(sortedTimestamps);
      }
    });
  });
});
