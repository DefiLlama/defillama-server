import { craftProtocolsResponse } from "./getProtocols";
import { getProtocolTvl } from "./utils/getProtocolTvl";
import parentProtocolsList from "./protocols/parentProtocols";
import type { IParentProtocol } from "./protocols/types";
import type { IProtocol, LiteProtocol, ProtocolTvls } from "./types";
import { chainCoingeckoIds, currentChainLabelsList, getChainDisplayName, getChainKeyFromLabel, replaceChainNamesForOraclesByChain } from "./utils/normalizeChain";
import { extraSections } from "./utils/normalizeChain";
import fetch from "node-fetch";
import { excludeProtocolInCharts, hiddenCategoriesFromUISet, } from "./utils/excludeProtocols";
import protocols from "./protocols/data";
import { readRouteData } from "./api2/cache/file-cache";

export function hasDimensionsChainVisibility(chainAggData: any = {}) {
  if (typeof chainAggData !== "object" || chainAggData === null) return false;

  for (const adapterType in chainAggData) {
    const adapterAggData = chainAggData[adapterType];
    if (typeof adapterAggData !== "object" || adapterAggData === null) continue;

    for (const recordType in adapterAggData) {
      const recordTypeAggData = adapterAggData[recordType];
      if (typeof recordTypeAggData !== "object" || recordTypeAggData === null) continue;

      for (const _key in recordTypeAggData) {
        return true;
      }
    }
  }

  return false;
}

function hasDimensionsChainAggData(dimensionsChainAggData: any = {}) {
  if (typeof dimensionsChainAggData !== "object" || dimensionsChainAggData === null) return false;

  for (const _chain in dimensionsChainAggData) {
    return true;
  }

  return false;
}

function getVisibleChainLabel(chain: string) {
  if (!chain) return null;

  return getChainDisplayName(getChainKeyFromLabel(chain), true);
}

export function getVisibleChainLabels(
  protocolChainTvls: { [chain: string]: number },
  dimensionsChainAggData: any = {},
  fallbackChainLabels: string[] = [],
) {
  const normalizedProtocolChainTvls = new Map<string, number>();
  for (const chain in protocolChainTvls) {
    const visibleChainLabel = getVisibleChainLabel(chain);
    if (!visibleChainLabel) continue;

    normalizedProtocolChainTvls.set(
      visibleChainLabel,
      (normalizedProtocolChainTvls.get(visibleChainLabel) ?? 0) + protocolChainTvls[chain],
    );
  }

  const protocolBackedChainEntries = Array.from(normalizedProtocolChainTvls.entries());
  protocolBackedChainEntries.sort((a, b) => b[1] - a[1]);
  const protocolBackedChains: string[] = [];
  for (const [chain] of protocolBackedChainEntries) {
    protocolBackedChains.push(chain);
  }

  const visibleChains = new Set(protocolBackedChains);
  const dimensionBackedChains: string[] = [];
  for (const chainKey in dimensionsChainAggData) {
    const chainAggData = dimensionsChainAggData[chainKey];
    if (!hasDimensionsChainVisibility(chainAggData)) continue;

    const chainLabel = getVisibleChainLabel(chainKey);
    if (!chainLabel || chainCoingeckoIds[chainLabel] === undefined || visibleChains.has(chainLabel)) continue;

    visibleChains.add(chainLabel);
    dimensionBackedChains.push(chainLabel);
  }
  dimensionBackedChains.sort((a, b) => a.localeCompare(b));

  const fallbackChains: string[] = [];
  for (const chain of fallbackChainLabels) {
    const chainLabel = getVisibleChainLabel(chain);
    if (!chainLabel || visibleChains.has(chainLabel)) continue;

    visibleChains.add(chainLabel);
    fallbackChains.push(chainLabel);
  }

  return protocolBackedChains.concat(dimensionBackedChains, fallbackChains);
}

export async function storeGetProtocols({
  getCoinMarkets,
  getLastHourlyRecord,
  getLastHourlyTokensUsd,
  getYesterdayTvl,
  getLastWeekTvl,
  getLastMonthTvl,
  getYesterdayTokensUsd,
  getLastWeekTokensUsd,
  getLastMonthTokensUsd,
}: any = {}) {
  const idToName: Record<string, string> = {};
  for (const p of protocols) {
    if (p.id && p.name) idToName[p.id] = p.name;
  }
  for (const parent of parentProtocolsList) {
    if (parent.id && parent.name) idToName[parent.id] = parent.name;
  }

  const response = await craftProtocolsResponse(true, undefined, {
    getCoinMarkets,
    getLastHourlyRecord,
    getLastHourlyTokensUsd,
  });

  const getParentCoinMarkets = () =>
    fetch("https://coins.llama.fi/mcaps", {
      method: "POST",
      body: JSON.stringify({
        coins: parentProtocolsList
          .filter((parent) => typeof parent.gecko_id === "string")
          .map((parent) => `coingecko:${parent.gecko_id}`),
      }),
    }).then((r) => r.json());

  const _getCoinMarkets = getCoinMarkets ?? getParentCoinMarkets;
  const coinMarketsPromise = _getCoinMarkets();

  const childrenByParent = new Map<string, IProtocol[]>();
  for (const protocol of response) {
    if (!protocol.parentProtocol) continue;
    const children = childrenByParent.get(protocol.parentProtocol);
    if (children) children.push(protocol);
    else childrenByParent.set(protocol.parentProtocol, [protocol]);
  }

  const trimmedResponse: LiteProtocol[] = (
    await Promise.all(
      response.map(async (protocol: IProtocol) => {
        const protocolTvls: ProtocolTvls = await getProtocolTvl(protocol, true, {
          getLastHourlyRecord,
          getLastHourlyTokensUsd,
          getYesterdayTvl,
          getLastWeekTvl,
          getLastMonthTvl,
          getYesterdayTokensUsd,
          getLastWeekTokensUsd,
          getLastMonthTokensUsd,
        });
        let forkedFrom = protocol.forkedFrom;
        if (Array.isArray(protocol.forkedFromIds)) {
          forkedFrom = protocol.forkedFromIds.map((id) => idToName[id] || id);
        }
        return {
          category: protocol.category,
          ...(protocol.tags ? { tags: protocol.tags } : {}),
          chains: protocol.chains,
          oracles: protocol.oraclesBreakdown && protocol.oraclesBreakdown.length > 0
            ? protocol.oraclesBreakdown.map((x) => x.name)
            : protocol.oracles,
          oraclesByChain: replaceChainNamesForOraclesByChain(true, protocol.oraclesByChain),
          forkedFrom,
          listedAt: protocol.listedAt,
          mcap: protocol.mcap,
          name: protocol.name,
          symbol: protocol.symbol,
          logo: protocol.logo,
          url: protocol.url,
          referralUrl: protocol.referralUrl,
          tvl: protocolTvls.tvl,
          tvlPrevDay: protocolTvls.tvlPrevDay,
          tvlPrevWeek: protocolTvls.tvlPrevWeek,
          tvlPrevMonth: protocolTvls.tvlPrevMonth,
          chainTvls: protocolTvls.chainTvls,
          parentProtocol: protocol.parentProtocol,
          defillamaId: protocol.id,
          governanceID: protocol.governanceID,
          geckoId: protocol.gecko_id,
          ...(protocol.deprecated ? { deprecated: protocol.deprecated } : {})
        };
      })
    )
  ).filter((p) => !hiddenCategoriesFromUISet.has(p.category ?? ""));

  const chains = {} as { [chain: string]: number };
  const protocolCategoriesSet: Set<string> = new Set();

  trimmedResponse.forEach((p) => {
    if (!p.category) return;

    protocolCategoriesSet.add(p.category);
    if (!excludeProtocolInCharts(p.category)) {
      p.chains.forEach((c: string) => {
        chains[c] = (chains[c] ?? 0) + (p.chainTvls[c]?.tvl ?? 0);

        if (p.chainTvls[`${c}-liquidstaking`]) {
          chains[c] = (chains[c] ?? 0) - (p.chainTvls[`${c}-liquidstaking`]?.tvl ?? 0);
        }

        if (p.chainTvls[`${c}-doublecounted`]) {
          chains[c] = (chains[c] ?? 0) - (p.chainTvls[`${c}-doublecounted`]?.tvl ?? 0);
        }

        if (p.chainTvls[`${c}-dcAndLsOverlap`]) {
          chains[c] = (chains[c] ?? 0) + (p.chainTvls[`${c}-dcAndLsOverlap`]?.tvl ?? 0);
        }
      });
    }
  });

  const coinMarkets = await coinMarketsPromise;

  const extendedParentProtocols = [] as any[];
  const parentProtocols: IParentProtocol[] = parentProtocolsList.map((parent) => {
    const chains: Set<string> = new Set();

    const children = childrenByParent.get(parent.id) ?? [];
    let symbol = "-",
      tvl = 0,
      chainTvls = {} as { [chain: string]: number };
    children.forEach((child) => {
      if (child.symbol !== "-") {
        symbol = child.symbol;
      }
      tvl += child.tvl ?? 0;
      Object.entries(child.chainTvls ?? {}).forEach(([chain, chainTvl]) => {
        chainTvls[chain] = (chainTvls[chain] ?? 0) + chainTvl;
      });
      child.chains?.forEach((chain: string) => chains.add(chain));
    });

    const mcap = parent.gecko_id ? coinMarkets?.[`coingecko:${parent.gecko_id}`]?.mcap ?? null : null;
    extendedParentProtocols.push({
      id: parent.id,
      name: parent.name,
      symbol,
      //category,
      tvl,
      chainTvls,
      mcap,
      gecko_id: parent.gecko_id,
      isParent: true,
    });
    return {
      ...parent,
      chains: Array.from(chains),
      mcap,
    };
  });


  const dimensionsChainAggData = await readRouteData('/dimensions/chain-agg-data', {
    skipErrorLog: true,
  });
  let fallbackChainLabels: string[] = [];
  if (!hasDimensionsChainAggData(dimensionsChainAggData)) {
    const previousProtocols2Data = await readRouteData('/lite/protocols2', {
      skipErrorLog: true,
    });
    if (previousProtocols2Data?.chains) {
      fallbackChainLabels = previousProtocols2Data.chains;
    } else {
      for (const chain of currentChainLabelsList) {
        if (chainCoingeckoIds[chain]?.dimensions) {
          fallbackChainLabels.push(chain);
        }
      }
    }
    console.warn('Missing /dimensions/chain-agg-data while computing visible chains for /lite/protocols2, falling back to cached visible chains');
  }

  const chainsOutput = getVisibleChainLabels(chains, dimensionsChainAggData ?? {}, fallbackChainLabels)


  const protocols2Data = {
    protocols: trimmedResponse,
    chains: chainsOutput,
    protocolCategories: [...protocolCategoriesSet].filter((category) => category),
    parentProtocols,
  };

  const v2ProtocolData = response
    .filter((p) => !hiddenCategoriesFromUISet.has(p.category ?? ""))
    .map((protocol) => ({
      id: protocol.id,
      name: protocol.name,
      symbol: protocol.symbol,
      category: protocol.category,
      ...(protocol.tags ? { tags: protocol.tags } : {}),
      tvl: protocol.tvl,
      chainTvls: Object.fromEntries(
        Object.entries(protocol.chainTvls).filter((c) => !c[0].includes("-") && !extraSections.includes(c[0]))
      ),
      mcap: protocol.mcap,
      gecko_id: protocol.gecko_id,
      parent: protocol.parentProtocol,
      ...(protocol.deprecated ? { deprecated: true } : {})
    }))
    .concat(extendedParentProtocols);

  return { protocols2Data, v2ProtocolData };
}
