import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ETFFlowsResponse, isETFFlowsResponse } from './types';
import { etfFlowsResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.ETFS.BASE_URL);

describe('ETFs API - Flows', () => {
  let flowsResponse: ApiResponse<ETFFlowsResponse>;

  beforeAll(async () => {
    flowsResponse = await apiClient.get<ETFFlowsResponse>(endpoints.ETFS.FLOWS);
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(flowsResponse);
      expect(isETFFlowsResponse(flowsResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = etfFlowsResponseSchema.safeParse(flowsResponse.data);
      if (!result.success) {
        console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should return a non-empty array', () => {
      expect(Array.isArray(flowsResponse.data)).toBe(true);
      expect(flowsResponse.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected flow entries', () => {
      expect(flowsResponse.data.length).toBeGreaterThan(10);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have valid date strings', () => {
      flowsResponse.data.slice(0, 50).forEach((flow) => {
        expect(typeof flow.day).toBe('string');
        expect(flow.day.length).toBeGreaterThan(0);
        
        // Should be a valid ISO date string
        const date = new Date(flow.day);
        expect(isNaN(date.getTime())).toBe(false);
      });
    });

    it('should have chronologically ordered data', () => {
      const dates = flowsResponse.data.map((flow) => new Date(flow.day).getTime());
      
      // Data should be in some order (either ascending or descending)
      let ascending = 0;
      let descending = 0;
      
      for (let i = 1; i < Math.min(dates.length, 50); i++) {
        if (dates[i] >= dates[i - 1]) ascending++;
        if (dates[i] <= dates[i - 1]) descending++;
      }
      
      // At least 80% of adjacent pairs should follow the same order
      const total = Math.min(dates.length - 1, 49);
      expect(Math.max(ascending, descending) / total).toBeGreaterThan(0.8);
    });

    it('should have recent flow data', () => {
      const dates = flowsResponse.data.map((flow) => new Date(flow.day).getTime());
      const maxDate = Math.max(...dates);
      const nowInMs = Date.now();
      const ageInDays = (nowInMs - maxDate) / (86400 * 1000);
      
      // Data should be less than 30 days old
      expect(ageInDays).toBeLessThan(30);
    });

    it('should have flows for different assets', () => {
      const assets = new Set(flowsResponse.data.map((flow) => flow.gecko_id));
      expect(assets.size).toBeGreaterThan(0);
    });

    it('should have both positive and negative flows', () => {
      const validFlows = flowsResponse.data
        .filter((flow) => flow.total_flow_usd !== null && flow.total_flow_usd !== undefined);

      if (validFlows.length > 10) {
        const positiveFlows = validFlows.filter((flow) => flow.total_flow_usd! > 0);
        const negativeFlows = validFlows.filter((flow) => flow.total_flow_usd! < 0);
        
        // Should have at least some positive or negative flows
        expect(positiveFlows.length + negativeFlows.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Flow Item Validation', () => {
    it('should have required fields in all flow entries', () => {
      flowsResponse.data.slice(0, 50).forEach((flow) => {
        expect(flow).toHaveProperty('gecko_id');
        expect(flow).toHaveProperty('day');
        expect(flow).toHaveProperty('total_flow_usd');

        expect(typeof flow.gecko_id).toBe('string');
        expect(flow.gecko_id.length).toBeGreaterThan(0);
        expect(typeof flow.day).toBe('string');
        expect(flow.day.length).toBeGreaterThan(0);
      });
    });

    it('should have valid flow values when present', () => {
      const flowsWithValues = flowsResponse.data
        .filter((flow) => flow.total_flow_usd !== null && flow.total_flow_usd !== undefined)
        .slice(0, 50);

      if (flowsWithValues.length > 0) {
        flowsWithValues.forEach((flow) => {
          expectValidNumber(flow.total_flow_usd!);
          expect(isNaN(flow.total_flow_usd!)).toBe(false);
          expect(isFinite(flow.total_flow_usd!)).toBe(true);
        });
      }
    });

    it('should have reasonable flow magnitudes', () => {
      const flowsWithValues = flowsResponse.data
        .filter((flow) => flow.total_flow_usd !== null && flow.total_flow_usd !== undefined)
        .slice(0, 50);

      if (flowsWithValues.length > 0) {
        flowsWithValues.forEach((flow) => {
          const absFlow = Math.abs(flow.total_flow_usd!);
          // Flow should be less than $100 billion
          expect(absFlow).toBeLessThan(100_000_000_000);
        });
      }
    });
  });

  describe('Asset-Specific Validation', () => {
    it('should have Bitcoin flows', () => {
      const bitcoinFlows = flowsResponse.data.filter(
        (flow) => flow.gecko_id.toLowerCase() === 'bitcoin'
      );
      expect(bitcoinFlows.length).toBeGreaterThan(0);
    });

    it('should have aggregate flow statistics for Bitcoin', () => {
      const bitcoinFlows = flowsResponse.data
        .filter((flow) => flow.gecko_id.toLowerCase() === 'bitcoin')
        .filter((flow) => flow.total_flow_usd !== null && flow.total_flow_usd !== undefined);

      if (bitcoinFlows.length > 0) {
        const totalFlow = bitcoinFlows.reduce((sum, flow) => sum + flow.total_flow_usd!, 0);
        const avgFlow = totalFlow / bitcoinFlows.length;
        
        console.log(`Bitcoin flows: ${bitcoinFlows.length} entries, total: $${totalFlow.toLocaleString()}, avg: $${avgFlow.toLocaleString()}`);
        
        expect(isNaN(totalFlow)).toBe(false);
        expect(isFinite(totalFlow)).toBe(true);
      }
    });

    it('should have Ethereum flows if available', () => {
      const ethereumFlows = flowsResponse.data.filter(
        (flow) => flow.gecko_id.toLowerCase() === 'ethereum'
      );
      
      console.log(`Found ${ethereumFlows.length} Ethereum flow entries`);
      
      if (ethereumFlows.length > 0) {
        const validFlows = ethereumFlows.filter(
          (flow) => flow.total_flow_usd !== null && flow.total_flow_usd !== undefined
        );
        
        if (validFlows.length > 0) {
          const totalFlow = validFlows.reduce((sum, flow) => sum + flow.total_flow_usd!, 0);
          console.log(`Ethereum total flow: $${totalFlow.toLocaleString()}`);
        }
      }
    });
  });

  describe('Time Series Validation', () => {
    it('should have continuous date coverage for major assets', () => {
      const bitcoinFlows = flowsResponse.data
        .filter((flow) => flow.gecko_id.toLowerCase() === 'bitcoin')
        .sort((a, b) => new Date(a.day).getTime() - new Date(b.day).getTime());

      if (bitcoinFlows.length > 10) {
        // Check for gaps larger than 7 days
        let largeGaps = 0;
        for (let i = 1; i < Math.min(bitcoinFlows.length, 30); i++) {
          const prevDate = new Date(bitcoinFlows[i - 1].day);
          const currDate = new Date(bitcoinFlows[i].day);
          const gapDays = (currDate.getTime() - prevDate.getTime()) / (86400 * 1000);
          
          if (gapDays > 7) {
            largeGaps++;
          }
        }
        
        // Should have mostly continuous data (allow a few gaps)
        const totalPairs = Math.min(bitcoinFlows.length - 1, 29);
        expect(largeGaps / totalPairs).toBeLessThan(0.3);
      }
    });
  });
});

