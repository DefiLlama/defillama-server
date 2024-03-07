import { wrap, IResponse, cache20MinResponse } from "./utils/shared";
import protocols, { Protocol } from "./protocols/data";
import treasuries from "./protocols/treasury";
import entities from "./protocols/entities";
import { getLastRecord, hourlyTvl, hourlyUsdTokensTvl } from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import {
  getChainDisplayName,
  getDisplayChain,
  nonChains,
  addToChains,
  extraSections,
  transformNewChainName,
} from "./utils/normalizeChain";
import { craftChainsResponse } from "./getChains";
import type { IProtocol, IChain, ITvlsByChain } from "./types";
import fetch from "node-fetch";

export function getPercentChange(previous: number, current: number) {
  const change = (current / previous) * 100 - 100;
  if (change == Infinity || Number.isNaN(change)) {
    return null;
  }
  return change;
}

const majors = [
  "BTC",
  "ETH",
  "WBTC",
  "WETH",
  "aWBTC",
  "ammWBTC",
  "wstETH",
  "aEthwstETH",
  "aWETH",
  "ammWETH",
  "aEthWETH",
  "stETH",
  "aSTETH",
  "rETH",
  "sETH2",
  "rETH2",
  "frxETH",
  "sfrxETH",
  "renBTC",
  "icETH",
  "BTCB",
  "BETH",
  "mETH"
].map((t) => t.toUpperCase());
const stablecoins = [
  "USDT",
  "USDC",
  "DAI",
  "FRAX",
  "aUSDC",
  "ammUSDC",
  "aEthUSDC",
  "aDAI",
  "ammDAI",
  "aEthDAI",
  "aUSDT",
  "ammUSDT",
  "LUSD",
  "aLUSD",
  "GUSD",
  "aGUSD",
  "TUSD",
  "aTUSD",
  "USDP",
  "aUSDP",
  "FEI",
  "aFEI",
  "BUSD",
  "yyDAI+yUSDC+yUSDT+yTUSD",
  "cDAI",
  "BSC-USD",
  "USD+",
  "sUSD",
  "DOLA",
  "aUSDT",
  "amUSDC",
  "amDAI",
  "avUSDC",
  "aUSDC",
  "avDAI",
  "aAvaUSDC",
  "amUSDT",
  "aAvaUSDT",
  "aAvaDAI",
  "avUSDT",
  "aOptUSDC",
  "sUSDe",
  "USDY"
].map((t) => t.toUpperCase());

function getTokenBreakdowns(lastRecord: { tvl: { [token: string]: number }; ownTokens: { [token: string]: number } }) {
  const breakdown = {
    ownTokens: 0,
    stablecoins: 0,
    majors: 0,
    others: 0,
  };

  if (lastRecord["ownTokens"]) {
    for (const token in lastRecord["ownTokens"]) {
      breakdown.ownTokens = breakdown.ownTokens + lastRecord["ownTokens"][token];
    }
  }

  for (const token in lastRecord.tvl) {
    if (majors.includes(token)) {
      breakdown.majors = breakdown.majors + lastRecord.tvl[token];
    } else if (stablecoins.some((stable) => token.includes(stable))) {
      breakdown.stablecoins = breakdown.stablecoins + lastRecord.tvl[token];
    } else {
      breakdown.others = breakdown.others + lastRecord.tvl[token];
    }
  }

  return breakdown;
}

const apiV1Functions = {
  getCoinMarkets: async (protocols: Protocol[]) =>
    fetch("https://coins.llama.fi/mcaps", {
      method: "POST",
      body: JSON.stringify({
        coins: protocols
          .filter((protocol) => typeof protocol.gecko_id === "string")
          .map((protocol) => `coingecko:${protocol.gecko_id}`),
      }),
    }).then((r) => r.json()),
  getLastHourlyRecord: async (protocol: Protocol) => getLastRecord(hourlyTvl(protocol.id)),
  getLastHourlyTokensUsd: async (protocol: Protocol) => getLastRecord(hourlyUsdTokensTvl(protocol.id)),
};

export async function craftProtocolsResponseInternal(
  useNewChainNames: boolean,
  protocolList: Protocol[],
  includeTokenBreakdowns?: boolean,
  {
    getCoinMarkets = apiV1Functions.getCoinMarkets,
    getLastHourlyRecord = apiV1Functions.getLastHourlyRecord,
    getLastHourlyTokensUsd = apiV1Functions.getLastHourlyTokensUsd,
  } = {}
) {
  const coinMarkets = await getCoinMarkets(protocolList);

  const response = (
    await Promise.all(
      protocolList.map(async (protocol) => {
        let [lastHourlyRecord, lastHourlyTokensUsd] = await Promise.all([
          getLastHourlyRecord(protocol),
          includeTokenBreakdowns ? getLastHourlyTokensUsd(protocol) : {},
        ]);

        if (!lastHourlyRecord && protocol.module !== "dummy.js") {
          return null;
        }

        const returnedProtocol: Partial<Protocol> = { ...protocol };
        delete returnedProtocol.module;

        const chainTvls: ITvlsByChain = {};
        const chains: string[] = [];

        if (protocol.module !== "dummy.js" && lastHourlyRecord) {
          Object.entries(lastHourlyRecord).forEach(([chain, chainTvl]) => {
            if (nonChains.includes(chain)) {
              return;
            }
            const chainDisplayName = getChainDisplayName(chain, useNewChainNames);
            chainTvls[chainDisplayName] = chainTvl;
            addToChains(chains, chainDisplayName);
          });
          if (chains.length === 0) {
            const chain = useNewChainNames ? transformNewChainName(protocol.chain) : protocol.chain;
            if (chainTvls[chain] === undefined) {
              chainTvls[chain] = lastHourlyRecord.tvl;
            }
            extraSections.forEach((section) => {
              const chainSectionName = `${chain}-${section}`;
              if (chainTvls[section] !== undefined && chainTvls[chainSectionName] === undefined) {
                chainTvls[chainSectionName] = chainTvls[section];
              }
            });
            chains.push(getChainDisplayName(chain, useNewChainNames));
          }
        }

        const dataToReturn: Omit<IProtocol, "raises"> = {
          ...protocol,
          slug: sluggify(protocol),
          tvl: lastHourlyRecord?.tvl ?? null,
          chainTvls,
          chains: chains.sort((a, b) => chainTvls[b] - chainTvls[a]),
          chain: getDisplayChain(chains),
          change_1h: lastHourlyRecord ? getPercentChange(lastHourlyRecord.tvlPrev1Hour, lastHourlyRecord.tvl) : null,
          change_1d: lastHourlyRecord ? getPercentChange(lastHourlyRecord.tvlPrev1Day, lastHourlyRecord.tvl) : null,
          change_7d: lastHourlyRecord ? getPercentChange(lastHourlyRecord.tvlPrev1Week, lastHourlyRecord.tvl) : null,
          tokenBreakdowns: includeTokenBreakdowns && lastHourlyTokensUsd ? getTokenBreakdowns(lastHourlyTokensUsd as any) : {},
          mcap: protocol.gecko_id ? coinMarkets?.[`coingecko:${protocol.gecko_id}`]?.mcap ?? null : null,
        };

        const extraData: ["staking", "pool2"] = ["staking", "pool2"];

        for (let type of extraData) {
          if (lastHourlyRecord?.[type] !== undefined) {
            dataToReturn[type] = lastHourlyRecord[type];
          }
        }

        return dataToReturn;
      })
    )
  )
    .filter((protocol) => protocol !== null)
    .sort((a, b) => (b?.tvl ?? 0) - (a?.tvl ?? 0)) as IProtocol[];

  return response;
}

export async function craftProtocolsResponse(
  useNewChainNames: boolean,
  includeTokenBreakdowns?: boolean,
  options?: any
) {
  return craftProtocolsResponseInternal(useNewChainNames, protocols, includeTokenBreakdowns, options);
}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const protocols = await craftProtocolsResponse(false);

  const chainData: IChain[] = event.queryStringParameters?.includeChains === "true" ? await craftChainsResponse() : [];

  const response: Array<IProtocol | IChain> = [...protocols, ...chainData];

  return cache20MinResponse(response);
};

export const treasuriesHandler = async (): Promise<IResponse> => {
  return cache20MinResponse(await craftProtocolsResponseInternal(true, treasuries, true));
};

export const entitiesHandler = async (): Promise<IResponse> => {
  return cache20MinResponse(await craftProtocolsResponseInternal(true, entities, true));
};

// handler({ pathParameters: {} } as any).then(console.log);

export default wrap(handler);
