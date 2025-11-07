import { initializeTvlTests, TVL_ENDPOINTS } from './setup';
import { Protocol, isProtocolArray } from './types';
import { protocolSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
} from '../../utils/testHelpers';
import { validate, isValid, commonValidation } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';
import { z } from 'zod';

describe('TVL API - Protocols', () => {
  const apiClient = initializeTvlTests();
  let protocolsResponse: ApiResponse<Protocol[]>;

  beforeAll(async () => {
    protocolsResponse = await apiClient.get<Protocol[]>(TVL_ENDPOINTS.PROTOCOLS);
  });

  describe('Basic Response Validation', () => {
    it('should return successful response with valid structure', () => {
      expectSuccessfulResponse(protocolsResponse);
      expectArrayResponse(protocolsResponse);
      expectNonEmptyArray(protocolsResponse.data);
      expect(isProtocolArray(protocolsResponse.data)).toBe(true);
      expect(protocolsResponse.data.length).toBeGreaterThan(100);
    });

    it('should validate all protocols against Zod schema', () => {
      const errors: string[] = [];
      const invalidProtocols: any[] = [];
      
      protocolsResponse.data.forEach((protocol, idx) => {
        const result = validate(protocol, protocolSchema, `Protocol[${idx}]`);
        if (!result.success) {
          invalidProtocols.push(protocol);
          errors.push(...result.errors);
        }
      });
      
      if (invalidProtocols.length > 0) {
        console.error(`\nFound ${invalidProtocols.length} invalid protocols:`);
        console.error('Sample invalid protocols:', invalidProtocols.slice(0, 3).map(p => ({
          name: p.name || 'unknown',
          slug: p.slug || 'unknown',
          id: p.id || 'missing'
        })));
        console.error(`\nFirst 10 validation errors:\n${errors.slice(0, 10).join('\n')}`);
      }
      
      expect(invalidProtocols.length).toBe(0);
    });

    it('should have unique identifiers', () => {
      const ids = protocolsResponse.data.map((p) => p.id);
      const slugs = protocolsResponse.data.map((p) => p.slug);
      expect(new Set(ids).size).toBe(ids.length);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe('TVL Data Validation', () => {
    it('should have valid TVL values', () => {
      const protocolsWithTvl = protocolsResponse.data.filter((p) => p.tvl !== null && p.tvl >= 0);
      expect(protocolsWithTvl.length).toBeGreaterThan(0);
      
      protocolsWithTvl.forEach((protocol) => {
        expectValidNumber(protocol.tvl!);
        expectNonNegativeNumber(protocol.tvl!);
        expect(protocol.tvl!).toBeLessThan(10_000_000_000_000);
      });
    });


    it('should have valid chain TVLs and borrowed amounts', () => {
      const protocolsWithChainTvls = protocolsResponse.data.filter(
        (p) => p.chainTvls && Object.keys(p.chainTvls).length > 0
      );
      expect(protocolsWithChainTvls.length).toBeGreaterThan(0);

      protocolsWithChainTvls.slice(0, 10).forEach((protocol) => {
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
  });

  describe('Protocol Metadata', () => {
    it('should have valid categories and chains', () => {
      const protocolsWithCategory = protocolsResponse.data.filter((p) => p.category);
      expect(protocolsWithCategory.length).toBeGreaterThan(0);

      const categories = new Set(protocolsResponse.data.map((p) => p.category).filter(Boolean));
      expect(categories.size).toBeGreaterThan(5);

      const allChains = new Set<string>();
      protocolsResponse.data.forEach((p) => p.chains.forEach((c) => allChains.add(c)));
      expect(allChains.size).toBeGreaterThan(10);
    });

    it('should have valid percentage changes', () => {
      const protocolsWithChanges = protocolsResponse.data.filter(
        (p) => p.change_1h !== null || p.change_1d !== null || p.change_7d !== null
      );
      expect(protocolsWithChanges.length).toBeGreaterThan(0);

      protocolsWithChanges.slice(0, 10).forEach((protocol) => {
        if (protocol.change_1h !== null) expectValidNumber(protocol.change_1h);
        if (protocol.change_1d !== null) expectValidNumber(protocol.change_1d);
        if (protocol.change_7d !== null) expectValidNumber(protocol.change_7d);
      });
    });

    it('should have valid URLs when present', () => {
      const protocolsWithUrl = protocolsResponse.data.filter((p) => p.url || p.logo);
      expect(protocolsWithUrl.length).toBeGreaterThan(0);
      
      const urlSchema = z.string().regex(/^https?:\/\/.+/);
      
      protocolsWithUrl.slice(0, 10).forEach((protocol) => {
        if (protocol.url) {
          expect(isValid(protocol.url, urlSchema)).toBe(true);
        }
        if (protocol.logo) {
          expect(isValid(protocol.logo, urlSchema)).toBe(true);
        }
      });
    });

    it('should have valid timestamps and parent relationships', () => {
      const protocolsWithListedAt = protocolsResponse.data.filter((p) => p.listedAt);
      expect(protocolsWithListedAt.length).toBeGreaterThan(0);
      
      protocolsWithListedAt.slice(0, 10).forEach((protocol) => {
        expectValidNumber(protocol.listedAt!);
        expect(protocol.listedAt!).toBeGreaterThan(1500000000);
        expect(protocol.listedAt!).toBeLessThan(Date.now() / 1000);
      });

      const protocolsWithParent = protocolsResponse.data.filter((p) => p.parentProtocolSlug);
      if (protocolsWithParent.length > 0) {
        protocolsWithParent.slice(0, 5).forEach((protocol) => {
          expectNonEmptyString(protocol.parentProtocolSlug!);
          expect(protocol.parentProtocolSlug).not.toBe(protocol.slug);
        });
      }
    });

    it('should have valid oracles and methodology when present', () => {
      const protocolsWithOracles = protocolsResponse.data.filter((p) => p.oracles && p.oracles.length > 0);
      if (protocolsWithOracles.length > 0) {
        protocolsWithOracles.slice(0, 5).forEach((protocol) => {
          expect(Array.isArray(protocol.oracles)).toBe(true);
          protocol.oracles!.forEach((oracle) => expectNonEmptyString(oracle));
        });
      }

      const protocolsWithMethodology = protocolsResponse.data.filter((p) => p.methodology);
      if (protocolsWithMethodology.length > 0) {
        protocolsWithMethodology.slice(0, 3).forEach((protocol) => {
          expectNonEmptyString(protocol.methodology!);
        });
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle protocols with different chain counts', () => {
      const emptyChains = protocolsResponse.data.filter((p) => p.chains.length === 0);
      const singleChain = protocolsResponse.data.filter((p) => p.chains.length === 1);
      const multiChain = protocolsResponse.data.filter((p) => p.chains.length > 5);
      
      expect(singleChain.length).toBeGreaterThan(0);
      expect(multiChain.length).toBeGreaterThan(0);
      
      multiChain.slice(0, 3).forEach((protocol) => {
        protocol.chains.forEach((chain) => expectNonEmptyString(chain));
      });
    });

    it('should handle protocols with null or zero TVL', () => {
      const nullTvl = protocolsResponse.data.filter((p) => p.tvl === null);
      const zeroTvl = protocolsResponse.data.filter((p) => p.tvl === 0);
      
      nullTvl.forEach((protocol) => expect(protocol.tvl).toBeNull());
      zeroTvl.forEach((protocol) => expect(protocol.tvl).toBe(0));
    });

    it('should handle optional fields correctly', () => {
      const withStaking = protocolsResponse.data.filter((p) => p.staking !== undefined);
      const withMcap = protocolsResponse.data.filter((p) => p.mcap !== null);
      const withPool2 = protocolsResponse.data.filter((p) => p.pool2 !== undefined);
      
      if (withStaking.length > 0) {
        withStaking.slice(0, 3).forEach((protocol) => {
          expectValidNumber(protocol.staking!);
          expectNonNegativeNumber(protocol.staking!);
        });
      }
      
      if (withMcap.length > 0) {
        withMcap.slice(0, 3).forEach((protocol) => {
          expectValidNumber(protocol.mcap!);
          expectNonNegativeNumber(protocol.mcap!);
        });
      }

      if (withPool2.length > 0) {
        withPool2.slice(0, 3).forEach((protocol) => {
          expectValidNumber(protocol.pool2!);
          expectNonNegativeNumber(protocol.pool2!);
        });
      }
    });

    it('should handle protocol flags correctly', () => {
      const withFlags = protocolsResponse.data.filter(
        (p) => p.rugged || p.misrepresentedTokens || p.wrongLiquidity || p.openSource !== undefined
      );
      
      if (withFlags.length > 0) {
        withFlags.forEach((protocol) => {
          if (protocol.rugged !== undefined) expect(typeof protocol.rugged).toBe('boolean');
          if (protocol.misrepresentedTokens !== undefined) expect(typeof protocol.misrepresentedTokens).toBe('boolean');
          if (protocol.wrongLiquidity !== undefined) expect(typeof protocol.wrongLiquidity).toBe('boolean');
          if (protocol.openSource !== undefined) expect(typeof protocol.openSource).toBe('boolean');
        });
      }
    });
  });
});
