import { wrap, IResponse, cache20MinResponse } from "./utils/shared";
import protocols, { Protocol, treasuries } from "./protocols/data";
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
];
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
];

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
    } else if (stablecoins.includes(token)) {
      breakdown.stablecoins = breakdown.stablecoins + lastRecord.tvl[token];
    } else {
      breakdown.others = breakdown.others + lastRecord.tvl[token];
    }
  }

  return breakdown;
}

async function craftProtocolsResponseInternal(
  useNewChainNames: boolean,
  protocolList: Protocol[],
  includeTokenBreakdowns?: boolean
) {
  const coinMarkets = fetch("https://coins.llama.fi/mcaps", {
    method: "POST",
    body: JSON.stringify({
      coins: protocolList
        .filter((protocol) => typeof protocol.gecko_id === "string")
        .map((protocol) => `coingecko:${protocol.gecko_id}`),
    }),
  }).then((r) => r.json());

  const response = (
    await Promise.all(
      protocolList.map(async (protocol) => {
        const [lastHourlyRecord, lastHourlyTokensUsd] = await Promise.all([
          getLastRecord(hourlyTvl(protocol.id)),
          includeTokenBreakdowns ? getLastRecord(hourlyUsdTokensTvl(protocol.id)) : {},
        ]);

        if (!lastHourlyRecord) {
          return null;
        }

        const returnedProtocol: Partial<Protocol> = { ...protocol };
        delete returnedProtocol.module;

        const chainTvls: ITvlsByChain = {};

        const chains: string[] = [];
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

        const dataToReturn: IProtocol = {
          ...protocol,
          slug: sluggify(protocol),
          tvl: lastHourlyRecord.tvl,
          chainTvls,
          chains: chains.sort((a, b) => chainTvls[b] - chainTvls[a]),
          chain: getDisplayChain(chains),
          change_1h: getPercentChange(lastHourlyRecord.tvlPrev1Hour, lastHourlyRecord.tvl),
          change_1d: getPercentChange(lastHourlyRecord.tvlPrev1Day, lastHourlyRecord.tvl),
          change_7d: getPercentChange(lastHourlyRecord.tvlPrev1Week, lastHourlyRecord.tvl),
          tokenBreakdowns: includeTokenBreakdowns ? getTokenBreakdowns(lastHourlyTokensUsd) : {},
        };

        const extraData: ["staking", "pool2"] = ["staking", "pool2"];

        for (let type of extraData) {
          if (lastHourlyRecord[type] !== undefined) {
            dataToReturn[type] = lastHourlyRecord[type];
          }
        }

        if (typeof protocol.gecko_id === "string") {
          const coingeckoData = (await coinMarkets)[`coingecko:${protocol.gecko_id}`];
          if (coingeckoData !== undefined) {
            dataToReturn.mcap = coingeckoData.mcap;
          }
        }

        return dataToReturn;
      })
    )
  )
    .filter((protocol) => protocol !== null)
    .sort((a, b) => b!.tvl - a!.tvl) as IProtocol[];

  return response;
}

export async function craftProtocolsResponse(useNewChainNames: boolean) {
  return craftProtocolsResponseInternal(useNewChainNames, protocols);
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

export default wrap(handler);
