import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { CategoriesResponse, isCategoriesResponse } from './types';
import { categoriesResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
} from '../../utils/testHelpers';
import { validate } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.MAIN_PAGE.BASE_URL);

describe('Main Page API - Categories', () => {
  let categoriesResponse: ApiResponse<CategoriesResponse>;

  beforeAll(async () => {
    categoriesResponse = await apiClient.get<CategoriesResponse>(
      endpoints.MAIN_PAGE.CATEGORIES
    );
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(categoriesResponse);
      expect(isCategoriesResponse(categoriesResponse.data)).toBe(true);
      expect(categoriesResponse.data).toHaveProperty('categories');
      expect(categoriesResponse.data).toHaveProperty('chart');
      expect(typeof categoriesResponse.data.categories).toBe('object');
    });

    it('should validate against Zod schema', () => {
      const result = validate(
        categoriesResponse.data,
        categoriesResponseSchema,
        'Categories'
      );
      expect(result.success).toBe(true);
      if (!result.success) {
        console.error('Validation errors (first 5):', result.errors.slice(0, 5));
      }
    });

    it('should have non-empty categories object', () => {
      const categoryKeys = Object.keys(categoriesResponse.data.categories);
      expect(categoryKeys.length).toBeGreaterThan(0);
    });

    it('should have minimum expected categories', () => {
      const categoryKeys = Object.keys(categoriesResponse.data.categories);
      expect(categoryKeys.length).toBeGreaterThan(10);
    });
  });

  describe('Category Data Validation', () => {
    it('should have valid category names as keys', () => {
      const categoryKeys = Object.keys(categoriesResponse.data.categories);
      
      categoryKeys.slice(0, 20).forEach((categoryName) => {
        expect(typeof categoryName).toBe('string');
        expect(categoryName.length).toBeGreaterThan(0);
      });
    });

    it('should have arrays of protocols for each category', () => {
      const categories = categoriesResponse.data.categories;
      const categoryKeys = Object.keys(categories);

      categoryKeys.slice(0, 20).forEach((categoryName) => {
        expect(Array.isArray(categories[categoryName])).toBe(true);
      });
    });

    it('should have protocol names as strings in each category array', () => {
      const categories = categoriesResponse.data.categories;
      const categoryKeys = Object.keys(categories);

      categoryKeys.slice(0, 10).forEach((categoryName) => {
        const protocols = categories[categoryName];
        
        if (protocols.length > 0) {
          protocols.slice(0, 5).forEach((protocolName) => {
            expect(typeof protocolName).toBe('string');
            expect(protocolName.length).toBeGreaterThan(0);
          });
        }
      });
    });

    it('should have well-known categories', () => {
      const categoryKeys = Object.keys(categoriesResponse.data.categories).map(k => k.toLowerCase());
      const wellKnownCategories = ['dexs', 'lending', 'bridge'];
      
      const foundCategories = wellKnownCategories.filter((name) =>
        categoryKeys.some((cName) => cName.toLowerCase().includes(name))
      );

      expect(foundCategories.length).toBeGreaterThan(0);
    });

    it('should have categories with multiple protocols', () => {
      const categories = categoriesResponse.data.categories;
      const categoriesWithProtocols = Object.entries(categories)
        .filter(([_, protocols]) => protocols.length > 1);

      expect(categoriesWithProtocols.length).toBeGreaterThan(0);
    });
  });

  describe('Chart Data Validation', () => {
    it('should have chart data with timestamps', () => {
      const chart = categoriesResponse.data.chart;
      const timestamps = Object.keys(chart);

      expect(timestamps.length).toBeGreaterThan(0);
      
      timestamps.slice(0, 10).forEach((timestamp) => {
        const ts = Number(timestamp);
        expect(isNaN(ts)).toBe(false);
        expect(ts).toBeGreaterThan(0);
      });
    });

    it('should have category data in chart entries', () => {
      const chart = categoriesResponse.data.chart;
      const timestamps = Object.keys(chart);

      if (timestamps.length > 0) {
        const firstTimestamp = timestamps[0];
        const categoryData = chart[firstTimestamp];
        
        expect(typeof categoryData).toBe('object');
        
        const categoryKeys = Object.keys(categoryData);
        expect(categoryKeys.length).toBeGreaterThan(0);
      }
    });

    it('should have TVL data in chart category entries', () => {
      const chart = categoriesResponse.data.chart;
      const timestamps = Object.keys(chart);

      if (timestamps.length > 0) {
        const firstTimestamp = timestamps[0];
        const categoryData = chart[firstTimestamp];
        const categoryKeys = Object.keys(categoryData);

        if (categoryKeys.length > 0) {
          categoryKeys.slice(0, 5).forEach((categoryName) => {
            expect(typeof categoryData[categoryName]).toBe('object');
          });
        }
      }
    });

    it('should have chronologically ordered timestamps', () => {
      const timestamps = Object.keys(categoriesResponse.data.chart).map(Number);
      
      if (timestamps.length > 1) {
        const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
        expect(timestamps).toEqual(sortedTimestamps);
      }
    });
  });
});
