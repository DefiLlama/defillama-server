import { craftProtocolsResponse } from "./getProtocols";
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { constants, brotliCompressSync } from "zlib";
import { getProtocolTvl } from "./utils/getProtocolTvl";
import parentProtocolsList from "./protocols/parentProtocols";
import type { IParentProtocol } from "./protocols/types";
import type { IProtocol, LiteProtocol, ProtocolTvls } from "./types";
import { storeR2 } from "./utils/r2";
import { getChainDisplayName } from "./utils/normalizeChain";
import { extraSections } from "./utils/normalizeChain";
import fetch from "node-fetch";

function compress(data: string) {
  return brotliCompressSync(data, {
    [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
  });
}

function replaceChainNames(
  oraclesByChain?:
    | {
      [chain: string]: string[];
    }
    | undefined
) {
  if (!oraclesByChain) return oraclesByChain;
  return Object.fromEntries(
    Object.entries(oraclesByChain).map(([chain, vals]) => [getChainDisplayName(chain, true), vals])
  );
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
  const response = await craftProtocolsResponse(true, undefined, {
    getCoinMarkets,
    getLastHourlyRecord,
    getLastHourlyTokensUsd,
  });

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
        return {
          category: protocol.category,
          chains: protocol.chains,
          oracles: protocol.oracles,
          oraclesByChain: replaceChainNames(protocol.oraclesByChain),
          forkedFrom: protocol.forkedFrom,
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
        };
      })
    )
  ).filter((p) => p.category !== "Chain" && p.category !== "CEX");

  const chains = {} as { [chain: string]: number };
  const protocolCategoriesSet: Set<string> = new Set();

  trimmedResponse.forEach((p) => {
    if (!p.category) return;

    protocolCategoriesSet.add(p.category);
    if (p.category !== "Bridge" && p.category !== "RWA" && p.category !== "Basis Trading") {
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
  const coinMarkets = await _getCoinMarkets();

  const extendedParentProtocols = [] as any[];
  const parentProtocols: IParentProtocol[] = parentProtocolsList.map((parent) => {
    const chains: Set<string> = new Set();

    const children = response.filter((protocol) => protocol.parentProtocol === parent.id);
    let symbol = "-",
      tvl = 0,
      chainTvls = {} as { [chain: string]: number };
    children.forEach((child) => {
      if (child.symbol !== "-") {
        symbol = child.symbol;
      }
      tvl += child.tvl ?? 0;
      Object.entries(child.chainTvls).forEach(([chain, chainTvl]) => {
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

  const protocols2Data = {
    protocols: trimmedResponse,
    chains: Object.entries(chains)
      .sort((a, b) => b[1] - a[1])
      .map((c) => c[0]),
    protocolCategories: [...protocolCategoriesSet].filter((category) => category),
    parentProtocols,
  };

  const v2ProtocolData = response
    .filter((p) => p.category !== "Chain" && p.category !== "CEX")
    .map((protocol) => ({
      id: protocol.id,
      name: protocol.name,
      symbol: protocol.symbol,
      category: protocol.category,
      tvl: protocol.tvl,
      chainTvls: Object.fromEntries(
        Object.entries(protocol.chainTvls).filter((c) => !c[0].includes("-") && !extraSections.includes(c[0]))
      ),
      mcap: protocol.mcap,
      gecko_id: protocol.gecko_id,
      parent: protocol.parentProtocol,
    }))
    .concat(extendedParentProtocols);

  return { protocols2Data, v2ProtocolData };
}

const handler = async (_event: any) => {
  const { protocols2Data, v2ProtocolData } = await storeGetProtocols();
  const compressedV2Response = compress(JSON.stringify(protocols2Data));
  await storeR2("lite/protocols2", compressedV2Response, true);
  await storeR2("lite/v2/protocols", JSON.stringify(v2ProtocolData), true, false);
};

export default wrapScheduledLambda(handler);
