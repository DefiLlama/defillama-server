import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols, { Protocol } from "./protocols/data";
import { getLastRecord, hourlyTvl } from "./utils/getLastRecord";
import sluggify from "./utils/sluggify";
import {
  getChainDisplayName,
  getDisplayChain,
  nonChains,
  addToChains,
  extraSections,
  transformNewChainName,
} from "./utils/normalizeChain";
import { batchGet } from "./utils/shared/dynamodb";
import { craftChainsResponse } from "./getChains";
import type { IProtocol, IChain, ITvlsByChain } from "./types";

export function getPercentChange(previous: number, current: number) {
  const change = (current / previous) * 100 - 100;
  if (change == Infinity || Number.isNaN(change)) {
    return null;
  }
  return change;
}

export async function craftProtocolsResponse(useNewChainNames: boolean) {
  const coinMarkets = fetch("https://coins.llama.fi/mcaps", {
    method: "POST",
    body: JSON.stringify({coins:protocols
        .filter((protocol) => typeof protocol.gecko_id === "string")
        .map((protocol) => `coingecko:${protocol.gecko_id}`)})
    }).then(r=>r.json())

  const response = (
    await Promise.all(
      protocols.map(async (protocol) => {
        const lastHourlyRecord = await getLastRecord(hourlyTvl(protocol.id));

        if (!lastHourlyRecord) {
          return null
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
          const chain = useNewChainNames
            ? transformNewChainName(protocol.chain)
            : protocol.chain;
          if (chainTvls[chain] === undefined) {
            chainTvls[chain] = lastHourlyRecord.tvl;
          }
          extraSections.forEach((section) => {
            const chainSectionName = `${chain}-${section}`;
            if (
              chainTvls[section] !== undefined &&
              chainTvls[chainSectionName] === undefined
            ) {
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
          change_1h: getPercentChange(
            lastHourlyRecord.tvlPrev1Hour,
            lastHourlyRecord.tvl
          ),
          change_1d: getPercentChange(
            lastHourlyRecord.tvlPrev1Day,
            lastHourlyRecord.tvl
          ),
          change_7d: getPercentChange(
            lastHourlyRecord.tvlPrev1Week,
            lastHourlyRecord.tvl
          ),
        };

        const extraData: ["staking", "pool2"] = ["staking", "pool2"];

        for (let type of extraData) {
          if (lastHourlyRecord[type] !== undefined) {
            dataToReturn[type] = lastHourlyRecord[type];
          }
        }

        if (typeof protocol.gecko_id === "string") {
          const coingeckoData = (await coinMarkets)[
            `coingecko:${protocol.gecko_id}`
          ];
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

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const protocols = await craftProtocolsResponse(false);

  const chainData: IChain[] =
    event.queryStringParameters?.includeChains === "true"
      ? await craftChainsResponse()
      : [];

  const response: Array<IProtocol | IChain> = [...protocols, ...chainData];

  return successResponse(response, 10 * 60); // 10 mins cache
};

export default wrap(handler);
