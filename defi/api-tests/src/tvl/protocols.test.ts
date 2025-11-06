import { initializeTvlTests, TVL_ENDPOINTS } from './setup';
import { Protocol, isProtocolArray } from './types';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectArrayItemsHaveKeys,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validateProtocol, validateArray } from '../../utils/validators';
import { ApiResponse } from '../../utils/config/apiClient';

describe('TVL API - Protocols', () => {
  const apiClient = initializeTvlTests();
  let protocolsResponse: ApiResponse<Protocol[]>;

  beforeAll(async () => {
    protocolsResponse = await apiClient.get<Protocol[]>(TVL_ENDPOINTS.PROTOCOLS);
  });

  describe('GET /protocols', () => {
    it('should return list of all protocols', () => {
      expectSuccessfulResponse(protocolsResponse);
      expectArrayResponse(protocolsResponse);
      expectNonEmptyArray(protocolsResponse.data);
      expect(isProtocolArray(protocolsResponse.data)).toBe(true);
    });

    it('should return protocols with required fields', () => {
      const requiredFields = ['id', 'name', 'symbol', 'chains', 'slug'];
      expectArrayItemsHaveKeys(protocolsResponse.data, requiredFields);
    });

    it('should return protocols with valid data types', () => {
      const sampleSize = Math.min(10, protocolsResponse.data.length);
      const sampleProtocols = protocolsResponse.data.slice(0, sampleSize);

      sampleProtocols.forEach((protocol) => {
        expect(validateProtocol(protocol)).toBe(true);
        expectNonEmptyString(protocol.name);
        expectNonEmptyString(protocol.symbol);
        if (protocol.tvl !== null) {
          expectNonNegativeNumber(protocol.tvl);
        }
        expect(Array.isArray(protocol.chains)).toBe(true);
      });
    });

    it('should return protocols with valid TVL values', () => {
      const protocolsWithTvl = protocolsResponse.data.filter((p) => p.tvl !== null && p.tvl >= 0);
      
      expect(protocolsWithTvl.length).toBeGreaterThan(0);
      
      protocolsWithTvl.forEach((protocol) => {
        expectValidNumber(protocol.tvl!);
        expectNonNegativeNumber(protocol.tvl!);
        expect(protocol.tvl!).toBeLessThan(10_000_000_000_000);
      });
    });

    it('should return protocols with valid chain TVLs structure', () => {
      const protocolsWithChainTvls = protocolsResponse.data.filter(
        (p) => p.chainTvls && Object.keys(p.chainTvls).length > 0
      );
      expect(protocolsWithChainTvls.length).toBeGreaterThan(0);

      protocolsWithChainTvls.slice(0, 5).forEach((protocol) => {
        expect(typeof protocol.chainTvls).toBe('object');
        
        Object.entries(protocol.chainTvls).forEach(([chain, tvl]) => {
          expectNonEmptyString(chain);
          expectValidNumber(tvl);
          expectNonNegativeNumber(tvl);
        });

        if ('borrowed' in protocol.chainTvls) {
          expectValidNumber(protocol.chainTvls.borrowed!);
          expectNonNegativeNumber(protocol.chainTvls.borrowed!);
        }
      });
    });

    it('should handle protocols with borrowed amounts', () => {
      const protocolsWithBorrowed = protocolsResponse.data.filter(
        (p) => p.chainTvls && 'borrowed' in p.chainTvls
      );

      if (protocolsWithBorrowed.length > 0) {
        protocolsWithBorrowed.slice(0, 3).forEach((protocol) => {
          const borrowed = protocol.chainTvls.borrowed;
          if (borrowed !== undefined) {
            expectValidNumber(borrowed);
            expectNonNegativeNumber(borrowed);
          }

          const borrowedChains = Object.keys(protocol.chainTvls).filter(
            (key) => key.endsWith('-borrowed')
          );
          borrowedChains.forEach((chain) => {
            const chainTvl = protocol.chainTvls[chain as any];
            expectValidNumber(chainTvl);
            expectNonNegativeNumber(chainTvl);
          });
        });
      }
    });

    it('should return protocols ordered by TVL descending', () => {
      const protocolsWithTvl = protocolsResponse.data.filter((p) => p.tvl !== null);
      
      const sampleSize = Math.min(100, protocolsWithTvl.length);
      for (let i = 0; i < sampleSize - 1; i++) {
        expect(protocolsWithTvl[i].tvl!).toBeGreaterThanOrEqual(protocolsWithTvl[i + 1].tvl!);
      }
    });

    it('should have consistent data structure', () => {
      const allValid = validateArray(protocolsResponse.data, validateProtocol);
      expect(allValid).toBe(true);
    });

    it('should return protocols with categories', () => {
      const protocolsWithCategory = protocolsResponse.data.filter((p) => p.category);
      expect(protocolsWithCategory.length).toBeGreaterThan(0);
    });

    it('should return protocols with valid percentage changes', () => {
      const protocolsWithChanges = protocolsResponse.data.filter(
        (p) => p.change_1h !== null || p.change_1d !== null || p.change_7d !== null
      );

      expect(protocolsWithChanges.length).toBeGreaterThan(0);

      protocolsWithChanges.slice(0, 10).forEach((protocol) => {
        if (protocol.change_1h !== null && protocol.change_1h !== undefined) {
          expectValidNumber(protocol.change_1h);
        }
        if (protocol.change_1d !== null && protocol.change_1d !== undefined) {
          expectValidNumber(protocol.change_1d);
        }
        if (protocol.change_7d !== null && protocol.change_7d !== undefined) {
          expectValidNumber(protocol.change_7d);
        }
      });
    });

    it('should handle protocols with parent protocol slug', () => {
      const protocolsWithParent = protocolsResponse.data.filter((p) => p.parentProtocolSlug);

      if (protocolsWithParent.length > 0) {
        protocolsWithParent.slice(0, 5).forEach((protocol) => {
          expectNonEmptyString(protocol.parentProtocolSlug!);
          expect(protocol.parentProtocolSlug).not.toBe(protocol.slug);
        });
      }
    });

    it('should validate complete protocol structure', () => {
      const sampleProtocol = protocolsResponse.data[0];

      expect(sampleProtocol).toHaveProperty('id');
      expect(sampleProtocol).toHaveProperty('name');
      expect(sampleProtocol).toHaveProperty('symbol');
      expect(sampleProtocol).toHaveProperty('chains');
      expect(sampleProtocol).toHaveProperty('slug');

      expectNonEmptyString(sampleProtocol.id);
      expectNonEmptyString(sampleProtocol.name);
      expectNonEmptyString(sampleProtocol.symbol);
      expectNonEmptyString(sampleProtocol.slug);
      expect(Array.isArray(sampleProtocol.chains)).toBe(true);
      expect(typeof sampleProtocol.chainTvls).toBe('object');
    });
  });
});
