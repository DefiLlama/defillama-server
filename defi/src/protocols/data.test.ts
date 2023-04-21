import protocols, { Protocol, treasuries } from "./data";
import { baseIconsUrl } from "../constants";
import { importAdapter, } from "../cli/utils/importAdapter";
import { normalizeChain, chainCoingeckoIds, getChainDisplayName, transformNewChainName } from "../utils/normalizeChain";
import parentProtocols from "./parentProtocols";
import emissionsAdapters from "../utils/imports/emissions_adapters";
const fs = require("fs");

test("all the dynamic imports work", async () => {
  await Promise.all(protocols.map(importAdapter))
  await Promise.all(treasuries.map(importAdapter))
});

const ignored = ['default', 'staking', 'pool2', 'treasury', "hallmarks", "borrowed", "ownTokens"]
test("all chains are on chainMap", async () => {
  const allProtocols = [protocols, treasuries].flat()
  for (const protocol of allProtocols) {
    const module = await importAdapter(protocol)
    Object.entries(module).map(entry => {
      if (!ignored.includes(entry[0]) && typeof entry[1] === "object") {
        const chain = getChainDisplayName(entry[0], true)
        if (chainCoingeckoIds[chain] === undefined) {
          throw new Error(`${chain} (found in ${protocol.name}) should be on chainMap`)
        }
      }
    })
    protocol.chains.concat(protocol.chain).map(chainRaw => {
      const chain = transformNewChainName(chainRaw)
      if (chainCoingeckoIds[chain] === undefined && chain !== "Multi-Chain") {
        throw new Error(`${chain} (found in ${protocol.name}) should be on chainMap`)
      }
    })
  }
});

test("there are no repeated values in unlock adapters", async () => {
  const tokens = [] as string[], protocolIds = [] as string[][], notes = [] as string[][], sources = [] as string[][];
  for (const rawProtocol of Object.values(emissionsAdapters).map(p=>p.default)) {
    const protocol = rawProtocol.meta;
    expect(protocol.token).not.toBe(undefined)
    expect(tokens).not.toContain(protocol.token);
    tokens.push(protocol.token);
    if(protocol.protocolIds){
      expect(protocolIds).not.toContain(protocol.protocolIds);
      protocolIds.push(protocol.protocolIds);
    }
    if(protocol.notes){
      expect(notes).not.toContain(protocol.notes);
      notes.push(protocol.notes);
    }
    if(protocol.sources){
      expect(sources).not.toContain(protocol.sources);
      sources.push(protocol.sources);
    }
  }
})

test("valid treasury fields", async () => {
  const treasuryKeys = new Set(['ownTokens', 'tvl'])
  const ignoredKeys = new Set(['default'])
  await Promise.all(treasuries.map(async protocol => {
    const module = await importAdapter(protocol)
    for (const [chain, value] of Object.entries(module)) {
      if (typeof value !== 'object' || ignoredKeys.has(chain)) continue;
      for (const [key, _module] of Object.entries(value as Object)) {
        if (typeof _module !== 'function' || !treasuryKeys.has(key))
          throw new Error('Bad module for adapter: ' + protocol.name + ' in chain ' + chain + ' key:' + key)
      }
    }
  }))
});

test("projects have a single chain or each chain has an adapter", async () => {
  for (const protocol of protocols) {
    if (protocol.module === 'dummy.js') continue;
    const module = await importAdapter(protocol)
    const chains = protocol.module.includes("volumes/") ? Object.keys(module) : protocol.chains.map((chain) => normalizeChain(chain));
    if (chains.length > 1) {
      chains.forEach((chain) => {
        if (module[chain] === undefined) {
          if (chain === "avalanche" && module["avax"] !== undefined) {
            return
          }
          throw new Error(
            `Protocol "${protocol.name}" doesn't have chain "${chain}" on their module`
          );
        }
      });
    }
  }
});

test("parentProtocol exists", async () => {
  const parentIds = parentProtocols.map(p=>p.id)
  for (const protocol of protocols) {
    if(protocol.parentProtocol)
    expect(parentIds).toContain(protocol.parentProtocol);
  }
});

test("no id is repeated", async () => {
  const ids = [];
  for (const protocol of (protocols as {id:string}[]).concat(parentProtocols)) {
    expect(ids).not.toContain(protocol.id);
    ids.push(protocol.id);
  }
});

test("no coingeckoId is repeated", async () => {
  const ids = [];
  for (const protocol of protocols) {
    const id = protocol.gecko_id
    if (typeof id === "string") {
      expect(ids).not.toContain(id);
      ids.push(id);
    }
  }
});


test("no surprise category", async () => {
  const whitelistedCategories = [
    'Dexes',
    'Bridge',
    'Lending',
    'Yield Aggregator',
    'Synthetics',
    'CDP',
    'Services',
    'Insurance',
    'Cross Chain',
    'Options',
    'Chain',
    'Derivatives',
    'Payments',
    'Privacy',
    'Staking',
    'Yield',
    'RWA',
    'Indexes',
    'Algo-Stables',
    'Liquid Staking',
    'Farm',
    'Reserve Currency',
    'Launchpad',
    'Oracle',
    'Prediction Market',
    'NFT Marketplace',
    'NFT Lending',
    'Gaming',
    'Uncollateralized Lending',
    'Exotic Options',
    'CEX',
    'Leveraged Farming',
    'RWA Lending',
    'Options Vault',
    'Liquidity manager',
    'Staking Pool',
    'Infrastructure',    
  ]
  for (const protocol of protocols) {
    expect(whitelistedCategories).toContain(protocol.category);
  }
});

test("no module repeated", async () => {
  const ids = [];
  for (const protocol of protocols) {
    const script = protocol.module
    if (script === 'dummy.js') continue; // dummy.js is an exception
    expect(ids).not.toContain(script);
    ids.push(script);
  }
});

test("icon exists", async () => {
  for (const protocol of protocols) {
    const icon = protocol.logo?.substr(baseIconsUrl.length + 1);
    if (icon !== undefined) {
      const path = `./icons/${icon}`;
      if (!fs.existsSync(path)) {
        throw new Error(`Icon ${path} doesn't exist`);
      }
    }
  }
});
