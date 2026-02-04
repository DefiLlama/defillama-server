import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { ETFSnapshotResponse, isETFSnapshotResponse } from './types';
import { etfSnapshotResponseSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectValidNumber,
  expectNonNegativeNumber,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { ApiResponse } from '../../utils/config/apiClient';

const apiClient = createApiClient(endpoints.ETFS.BASE_URL);

describe('ETFs API - Snapshot', () => {
  let snapshotResponse: ApiResponse<ETFSnapshotResponse>;

  beforeAll(async () => {
    snapshotResponse = await apiClient.get<ETFSnapshotResponse>(endpoints.ETFS.SNAPSHOT);
  }, 30000);

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(snapshotResponse);
      expect(isETFSnapshotResponse(snapshotResponse.data)).toBe(true);
    });

    it('should validate against Zod schema', () => {
      const result = etfSnapshotResponseSchema.safeParse(snapshotResponse.data);
      if (!result.success) {
        console.log('Validation errors:', JSON.stringify(result.error.issues.slice(0, 10), null, 2));
      }
      expect(result.success).toBe(true);
    });

    it('should return a non-empty array', () => {
      expect(Array.isArray(snapshotResponse.data)).toBe(true);
      expect(snapshotResponse.data.length).toBeGreaterThan(0);
    });

    it('should have minimum expected ETFs', () => {
      expect(snapshotResponse.data.length).toBeGreaterThan(5);
    });
  });

  describe('Data Quality Validation', () => {
    it('should have ETFs with valid timestamps', () => {
      snapshotResponse.data.slice(0, 20).forEach((etf) => {
        expectValidTimestamp(etf.timestamp);
        expect(etf.timestamp).toBeGreaterThan(1600000000); // After Sept 2020
      });
    });

    it('should have recent timestamp data', () => {
      const timestamps = snapshotResponse.data.map((etf) => etf.timestamp);
      const maxTimestamp = Math.max(...timestamps);
      const nowInSeconds = Math.floor(Date.now() / 1000);
      const ageInSeconds = nowInSeconds - maxTimestamp;
      
      // Data should be less than 14 days old (ETF data updates less frequently)
      expect(ageInSeconds).toBeLessThan(86400 * 14);
    });

    it('should have ETFs for different assets', () => {
      const assets = new Set(snapshotResponse.data.map((etf) => etf.asset));
      expect(assets.size).toBeGreaterThan(1);
    });

    it('should have ETFs from different issuers', () => {
      const issuers = new Set(snapshotResponse.data.map((etf) => etf.issuer));
      expect(issuers.size).toBeGreaterThan(1);
    });

    it('should have unique tickers', () => {
      const tickers = snapshotResponse.data.map((etf) => etf.ticker);
      const uniqueTickers = new Set(tickers);
      expect(uniqueTickers.size).toBe(tickers.length);
    });
  });

  describe('ETF Item Validation', () => {
    it('should have required fields in all ETFs', () => {
      snapshotResponse.data.slice(0, 20).forEach((etf) => {
        expect(etf).toHaveProperty('ticker');
        expect(etf).toHaveProperty('timestamp');
        expect(etf).toHaveProperty('asset');
        expect(etf).toHaveProperty('issuer');
        expect(etf).toHaveProperty('etf_name');

        expect(typeof etf.ticker).toBe('string');
        expect(etf.ticker.length).toBeGreaterThan(0);
        expect(typeof etf.asset).toBe('string');
        expect(etf.asset.length).toBeGreaterThan(0);
        expect(typeof etf.issuer).toBe('string');
        expect(etf.issuer.length).toBeGreaterThan(0);
        expect(typeof etf.etf_name).toBe('string');
        expect(etf.etf_name.length).toBeGreaterThan(0);
      });
    });

    it('should have valid fee percentages when present', () => {
      const etfsWithFees = snapshotResponse.data
        .filter((etf) => etf.pct_fee !== null && etf.pct_fee !== undefined)
        .slice(0, 20);

      if (etfsWithFees.length > 0) {
        etfsWithFees.forEach((etf) => {
          expectValidNumber(etf.pct_fee!);
          expectNonNegativeNumber(etf.pct_fee!);
          expect(etf.pct_fee).toBeGreaterThanOrEqual(0);
          expect(etf.pct_fee).toBeLessThan(10); // Fee should be less than 10%
        });
      }
    });

    it('should have valid AUM when present', () => {
      const etfsWithAUM = snapshotResponse.data
        .filter((etf) => etf.aum !== null && etf.aum !== undefined)
        .slice(0, 20);

      if (etfsWithAUM.length > 0) {
        etfsWithAUM.forEach((etf) => {
          expectValidNumber(etf.aum!);
          expectNonNegativeNumber(etf.aum!);
        });
      }
    });

    it('should have valid volume when present', () => {
      const etfsWithVolume = snapshotResponse.data
        .filter((etf) => etf.volume !== null && etf.volume !== undefined)
        .slice(0, 20);

      if (etfsWithVolume.length > 0) {
        etfsWithVolume.forEach((etf) => {
          expectValidNumber(etf.volume!);
          expectNonNegativeNumber(etf.volume!);
        });
      }
    });

    it('should have valid flows when present', () => {
      const etfsWithFlows = snapshotResponse.data
        .filter((etf) => etf.flows !== null && etf.flows !== undefined)
        .slice(0, 20);

      if (etfsWithFlows.length > 0) {
        etfsWithFlows.forEach((etf) => {
          expectValidNumber(etf.flows!);
        });
      }
    });

    it('should have valid URLs when present', () => {
      const etfsWithURLs = snapshotResponse.data
        .filter((etf) => etf.url && etf.url !== null)
        .slice(0, 20);

      if (etfsWithURLs.length > 0) {
        etfsWithURLs.forEach((etf) => {
          expect(typeof etf.url).toBe('string');
          expect(etf.url!.length).toBeGreaterThan(0);
          expect(etf.url).toMatch(/^https?:\/\//);
        });
      }
    });
  });

  describe('Asset-Specific Validation', () => {
    it('should have Bitcoin ETFs', () => {
      const bitcoinETFs = snapshotResponse.data.filter(
        (etf) => etf.asset.toLowerCase() === 'bitcoin'
      );
      expect(bitcoinETFs.length).toBeGreaterThan(0);
    });

    it('should have Ethereum ETFs if available', () => {
      const ethereumETFs = snapshotResponse.data.filter(
        (etf) => etf.asset.toLowerCase() === 'ethereum'
      );
      // Ethereum ETFs may or may not exist, so just log it
      console.log(`Found ${ethereumETFs.length} Ethereum ETFs`);
    });
  });
});

