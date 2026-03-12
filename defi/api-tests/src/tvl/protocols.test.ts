import { createApiClient } from '../../utils/config/apiClient';
import { endpoints } from '../../utils/config/endpoints';
import { Protocol, ProtocolDetails, isProtocolArray, isProtocolDetails } from './types';
import { protocolSchema, protocolDetailsSchema } from './schemas';
import {
  expectSuccessfulResponse,
  expectArrayResponse,
  expectObjectResponse,
  expectNonEmptyArray,
  expectValidNumber,
  expectNonNegativeNumber,
  expectNonEmptyString,
  expectValidTimestamp,
} from '../../utils/testHelpers';
import { validate, isValid } from '../../utils/validation';
import { ApiResponse } from '../../utils/config/apiClient';
import { z } from 'zod';

const apiClient = createApiClient(endpoints.TVL.BASE_URL);
const TVL_ENDPOINTS = endpoints.TVL;

describe('TVL API - Protocols', () => {
  const PROTOCOLS_ENDPOINT = TVL_ENDPOINTS.PROTOCOLS;
  let protocolsResponse: ApiResponse<Protocol[]>;

  beforeAll(async () => {
    protocolsResponse = await apiClient.get<Protocol[]>(PROTOCOLS_ENDPOINT);
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
      const slugSet = new Set<string>();
      const idSet = new Set<number>();
  
      protocolsResponse.data.forEach((protocol: any) => {
        if (slugSet.has(protocol.slug)) {
          throw new Error(`Duplicate slug found: ${protocol.slug} ${protocol.name}`);
        }
        slugSet.add(protocol.slug);
  
        if (idSet.has(protocol.id)) {
          throw new Error(`Duplicate id found: ${protocol.id} ${protocol.name}`);
        }
        idSet.add(protocol.id);
      });
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

describe('TVL API - Protocol Details', () => {
  // Configure test protocols - add more to test multiple protocols, or keep just one for speed
  const testProtocols = ['aave-v3'];
  const protocolResponses: Record<string, ApiResponse<ProtocolDetails>> = {};

  beforeAll(async () => {
    await Promise.all(
      testProtocols.map(async (slug) => {
        try {
          protocolResponses[slug] = await apiClient.get<ProtocolDetails>(TVL_ENDPOINTS.PROTOCOL(slug));
        } catch (error: any) {
          console.error(`Failed to fetch protocol ${slug}:`, error.message, error.details);
          throw error;
        }
      })
    );
  }, 60000);

  describe('Basic Response Validation', () => {
    testProtocols.forEach((slug) => {
      describe(`Protocol: ${slug}`, () => {
        it('should return successful response with valid structure', () => {
          expectSuccessfulResponse(protocolResponses[slug]);
          expectObjectResponse(protocolResponses[slug]);
          expect(isProtocolDetails(protocolResponses[slug].data)).toBe(true);
        });

        it('should validate against Zod schema', () => {
          const result = validate(protocolResponses[slug].data, protocolDetailsSchema, 'ProtocolDetails');
          expect(result.success).toBe(true);
          if (!result.success) {
            console.error('Validation errors:', result.errors);
          }
        });

        it('should have required fields', () => {
          const requiredFields = ['id', 'name', 'chains', 'chainTvls'];
          requiredFields.forEach((field) => {
            expect(protocolResponses[slug].data).toHaveProperty(field);
          });
        });

        it('should have valid identifiers', () => {
          expectNonEmptyString(protocolResponses[slug].data.id);
          expectNonEmptyString(protocolResponses[slug].data.name);
          if (protocolResponses[slug].data.slug) {
            expectNonEmptyString(protocolResponses[slug].data.slug);
          }
        });

        it('should have valid chains array', () => {
          expect(Array.isArray(protocolResponses[slug].data.chains)).toBe(true);
          protocolResponses[slug].data.chains.forEach((chain) => {
            expectNonEmptyString(chain);
          });
        });
      });
    });
  });

  describe('Historical TVL Data', () => {
    testProtocols.forEach((slug) => {
      describe(`Protocol: ${slug}`, () => {
        it('should have valid TVL array structure', () => {
          const response = protocolResponses[slug];
          if (response.data.tvl !== null) {
            expect(Array.isArray(response.data.tvl)).toBe(true);
            
            if (response.data.tvl.length > 0) {
              response.data.tvl.slice(0, 10).forEach((point) => {
                expectValidTimestamp(point.date);
                expectValidNumber(point.totalLiquidityUSD);
                expectNonNegativeNumber(point.totalLiquidityUSD);
              });
            }
          }
        });

        it('should have TVL data points in chronological order', () => {
          const response = protocolResponses[slug];
          if (response.data.tvl && response.data.tvl.length > 1) {
            const dates = response.data.tvl.map((p) => p.date);
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
          }
        });
      });
    });
  });

  describe('Chain TVL Breakdowns', () => {
    testProtocols.forEach((slug) => {
      describe(`Protocol: ${slug}`, () => {
        it('should have valid chainTvls structure', () => {
          const response = protocolResponses[slug];
          expect(typeof response.data.chainTvls).toBe('object');
          expect(response.data.chainTvls).not.toBeNull();

          const chainKeys = Object.keys(response.data.chainTvls);
          expect(chainKeys.length).toBeGreaterThan(0);

          chainKeys.slice(0, 5).forEach((chain) => {
            expectNonEmptyString(chain);
            const chainData = response.data.chainTvls[chain];
            expect(chainData).toHaveProperty('tvl');
            expect(Array.isArray(chainData.tvl)).toBe(true);

            if (chainData.tvl.length > 0) {
              chainData.tvl.slice(0, 5).forEach((point) => {
                expectValidTimestamp(point.date);
                expectValidNumber(point.totalLiquidityUSD);
                expectNonNegativeNumber(point.totalLiquidityUSD);
              });
            }
          });
        });

        it('should have chainTvls matching protocol chains', () => {
          const response = protocolResponses[slug];
          const chainTvlKeys = Object.keys(response.data.chainTvls);
          const protocolChains = response.data.chains;

          if (protocolChains.length > 0) {
            chainTvlKeys.forEach((chain) => {
              if (!chain.includes('-') && !chain.includes('borrowed') && !chain.includes('staking') && !chain.includes('pool2')) {
                expect(protocolChains).toContain(chain);
              }
            });
          }
        });

        it('should have valid currentChainTvls if present', () => {
          const response = protocolResponses[slug];
          if (response.data.currentChainTvls) {
            Object.entries(response.data.currentChainTvls).forEach(([chain, tvl]) => {
              expectNonEmptyString(chain);
              expectValidNumber(tvl);
              expectNonNegativeNumber(tvl);
            });
          }
        });
      });
    });
  });

  describe('Token Breakdowns', () => {
    testProtocols.forEach((slug) => {
      describe(`Protocol: ${slug}`, () => {
        it('should have valid tokensInUsd structure if present', () => {
          const response = protocolResponses[slug];
          if (response.data.tokensInUsd && response.data.tokensInUsd.length > 0) {
            expect(Array.isArray(response.data.tokensInUsd)).toBe(true);

            response.data.tokensInUsd.slice(0, 5).forEach((point) => {
              expectValidTimestamp(point.date);
              expect(typeof point.tokens).toBe('object');
              expect(point.tokens).not.toBeNull();

              Object.entries(point.tokens).forEach(([token, amount]) => {
                expectNonEmptyString(token);
                expectValidNumber(amount);
                expectNonNegativeNumber(amount);
              });
            });
          }
        });

        it('should have valid tokens structure if present', () => {
          const response = protocolResponses[slug];
          if (response.data.tokens && response.data.tokens.length > 0) {
            expect(Array.isArray(response.data.tokens)).toBe(true);

            response.data.tokens.slice(0, 5).forEach((point) => {
              expectValidTimestamp(point.date);
              expect(typeof point.tokens).toBe('object');
              expect(point.tokens).not.toBeNull();

              Object.entries(point.tokens).forEach(([token, amount]) => {
                expectNonEmptyString(token);
                expectValidNumber(amount);
                expectNonNegativeNumber(amount);
              });
            });
          }
        });

        it('should have token breakdowns in chainTvls if present', () => {
          const response = protocolResponses[slug];
          Object.entries(response.data.chainTvls).slice(0, 3).forEach(([, chainData]) => {
            if (chainData.tokensInUsd && chainData.tokensInUsd !== null && chainData.tokensInUsd.length > 0) {
              chainData.tokensInUsd.slice(0, 3).forEach((point) => {
                expectValidTimestamp(point.date);
                expect(typeof point.tokens).toBe('object');
              });
            }

            if (chainData.tokens && chainData.tokens !== null && chainData.tokens.length > 0) {
              chainData.tokens.slice(0, 3).forEach((point) => {
                expectValidTimestamp(point.date);
                expect(typeof point.tokens).toBe('object');
              });
            }
          });
        });
      });
    });
  });

  describe('Metadata Fields', () => {
    testProtocols.forEach((slug) => {
      describe(`Protocol: ${slug}`, () => {
        it('should have valid optional metadata fields', () => {
          const response = protocolResponses[slug];
          if (response.data.category) {
            expectNonEmptyString(response.data.category);
          }

          if (response.data.url) {
            expect(response.data.url).toMatch(/^https?:\/\//);
          }

          if (response.data.logo) {
            expect(response.data.logo).toMatch(/^https?:\/\//);
          }

          if (response.data.description) {
            expect(typeof response.data.description).toBe('string');
          }

          if (response.data.methodology) {
            expectNonEmptyString(response.data.methodology);
          }
        });

        it('should have valid raises array if present', () => {
          const response = protocolResponses[slug];
          if (response.data.raises && response.data.raises.length > 0) {
            expect(Array.isArray(response.data.raises)).toBe(true);

            response.data.raises.slice(0, 3).forEach((raise) => {
              if (raise.date) expectNonEmptyString(raise.date);
              if (raise.round) expectNonEmptyString(raise.round);
              if (raise.amount !== undefined) {
                expectValidNumber(raise.amount);
                expectNonNegativeNumber(raise.amount);
              }
              if (raise.valuation !== undefined) {
                expectValidNumber(raise.valuation);
                expectNonNegativeNumber(raise.valuation);
              }
            });
          }
        });

        it('should have valid hallmarks if present', () => {
          const response = protocolResponses[slug];
          if (response.data.hallmarks && response.data.hallmarks.length > 0) {
            expect(Array.isArray(response.data.hallmarks)).toBe(true);

            response.data.hallmarks.slice(0, 5).forEach((hallmark) => {
              if (Array.isArray(hallmark) && hallmark.length >= 2) {
                expectValidTimestamp(hallmark[0]);
                expect(typeof hallmark[1]).toBe('string');
              }
            });
          }
        });

        it('should have valid token metrics if present', () => {
          const response = protocolResponses[slug];
          if (response.data.tokenPrice !== null && response.data.tokenPrice !== undefined) {
            expectValidNumber(response.data.tokenPrice);
            expectNonNegativeNumber(response.data.tokenPrice);
          }

          if (response.data.tokenMcap !== null && response.data.tokenMcap !== undefined) {
            expectValidNumber(response.data.tokenMcap);
            expectNonNegativeNumber(response.data.tokenMcap);
          }

          if (response.data.tokenSupply !== null && response.data.tokenSupply !== undefined) {
            expectValidNumber(response.data.tokenSupply);
            expectNonNegativeNumber(response.data.tokenSupply);
          }

          if (response.data.mcap !== null && response.data.mcap !== undefined) {
            expectValidNumber(response.data.mcap);
            expectNonNegativeNumber(response.data.mcap);
          }
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent protocol gracefully', async () => {
      const NONEXISTENT_ENDPOINT = TVL_ENDPOINTS.PROTOCOL('non-existent-protocol-xyz-123');
      const response = await apiClient.get<ProtocolDetails>(NONEXISTENT_ENDPOINT);
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    testProtocols.forEach((slug) => {
      describe(`Protocol: ${slug}`, () => {
        it('should handle protocol with null TVL', () => {
          const response = protocolResponses[slug];
          if (response.data.tvl === null) {
            expect(response.data.tvl).toBeNull();
          }
        });

        it('should handle protocol with empty chainTvls', () => {
          const response = protocolResponses[slug];
          expect(typeof response.data.chainTvls).toBe('object');
        });

        it('should handle protocol with parent/child relationships', () => {
          const response = protocolResponses[slug];

          if (response.data.otherProtocols) {
            expect(Array.isArray(response.data.otherProtocols)).toBe(true);
            response.data.otherProtocols.forEach((name) => {
              expectNonEmptyString(name);
            });
          }

          if (response.data.parentProtocolSlug) {
            expectNonEmptyString(response.data.parentProtocolSlug);
          }
        });
      });
    });
  });
});
