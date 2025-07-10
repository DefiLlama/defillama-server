import { errorResponse, successResponse } from "./api2/routes/utils";
import * as HyperExpress from "hyper-express";
import { sluggifyString } from "./utils/sluggify";
import { getClosestDayStartTimestamp } from "./utils/date";
import { get20MinDate } from "./utils/shared";
import { IProtocol, processProtocols, TvlItem } from "./storeGetCharts";
import { chainCoingeckoIds, extraSections, getChainDisplayName, transformNewChainName } from "./utils/normalizeChain";

interface SumCategoriesOrTagsByChainTvls {
  [tvlSection: string]: {
    [timestamp: number]: number | undefined;
  };
}

function sum(sumDailyTvls: SumCategoriesOrTagsByChainTvls, tvlSection: string, timestampRaw: number, itemTvl: number) {
  const timestamp = getClosestDayStartTimestamp(timestampRaw);
  if (!sumDailyTvls[tvlSection]) {
    sumDailyTvls[tvlSection] = {};
  }
  if (typeof itemTvl === "number" && !Number.isNaN(itemTvl)) {
    sumDailyTvls[tvlSection][timestamp] = itemTvl + (sumDailyTvls[tvlSection][timestamp] ?? 0);
  } else {
    console.log("itemTvl is NaN", itemTvl, tvlSection, timestamp);
  }
}

async function getCategoryOrTagByChain({
  category,
  tag,
  chain,
}: {
  category?: string | null;
  tag?: string | null;
  chain?: string | null;
}) {
  const categoryOrTag = category || tag;
  if (!categoryOrTag) {
    return null;
  }

  const sumCategoryOrTagTvls: SumCategoriesOrTagsByChainTvls = {};

  await processProtocols(
    async (timestamp: number, item: TvlItem, protocol: IProtocol) => {
      let toInclude = true;

      if (category) {
        let hasCategory = category === sluggifyString(protocol.category ?? "");
        if (chain) {
          const pchains = Object.keys(item).map((c) => sluggifyString(transformNewChainName(c.split("-")[0])));
          hasCategory = hasCategory && pchains.includes(chain);
        }
        toInclude = hasCategory;
      }
      if (tag) {
        let hasTag = (protocol.tags ?? [])?.map((t) => sluggifyString(t)).includes(tag);
        if (chain) {
          hasTag =
            hasTag && (protocol.chains ?? []).map((c) => sluggifyString(transformNewChainName(c))).includes(chain);
        }
        toInclude = hasTag;
      }

      if (!toInclude) return;

      if (!chain) {
        // total - sum of all protocols on all chains
        sum(sumCategoryOrTagTvls, "tvl", timestamp, item.tvl);

        // doublecounted and liquid staking values === sum of tvl on all chains
        if (protocol.doublecounted) {
          sum(sumCategoryOrTagTvls, "doublecounted", timestamp, item.tvl);
        }
        if (protocol.category?.toLowerCase() === "liquid staking") {
          sum(sumCategoryOrTagTvls, "liquidstaking", timestamp, item.tvl);
        }
        // if protocol is under liquid staking category and is double counted, track those values so we dont add tvl twice
        if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
          sum(sumCategoryOrTagTvls, "dcAndLsOverlap", timestamp, item.tvl);
        }

        for (const pchain in item) {
          // formatted chain name maybe chainName (ethereum, solana etc) or extra tvl sections (staking, pool2 etc)
          const formattedChainName = getChainDisplayName(pchain, true);

          // if its an extra tvl section, include those values in "total" tvl of chart
          if (extraSections.includes(formattedChainName)) {
            sum(sumCategoryOrTagTvls, formattedChainName, timestamp, item[pchain]);
            continue;
          }
        }
      } else {
        let hasAtLeastOneChain = false;

        for (const pchain in item) {
          // formatted chain name maybe chainName (ethereum, solana etc) or extra tvl sections (staking, pool2 etc)
          const formattedChainName = getChainDisplayName(pchain, true);

          // if its an extra tvl section, skip
          if (extraSections.includes(formattedChainName)) {
            continue;
          }

          // get tvl of individual chain (ethereum, ethereum-staking etc)
          const [chainName, tvlSection] = formattedChainName.includes("-")
            ? formattedChainName.split("-")
            : [formattedChainName, "tvl"];

          if (chainCoingeckoIds[chainName] == null || sluggifyString(chainName) !== chain) {
            continue;
          }

          // doublecounted and liquidstaking === tvl on the chain, so check if tvlSection is not staking, pool2 etc
          if (tvlSection === "tvl") {
            sum(sumCategoryOrTagTvls, tvlSection, timestamp, item[pchain]);

            if (protocol.category?.toLowerCase() === "liquid staking") {
              sum(sumCategoryOrTagTvls, "liquidstaking", timestamp, item[pchain]);
            }

            if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
              sum(sumCategoryOrTagTvls, "dcAndLsOverlap", timestamp, item[pchain]);
            }

            //  if its a valid chain name, record that this protocol is on atleast more than one chain
            // reason to track this value is if a protocol is only on single chain, then it would only have 'tvl' in the above tvlSection value
            // and you want this protocol to appear on 'All Chains' page and its individual chain
            hasAtLeastOneChain = true;
          }
        }

        if (hasAtLeastOneChain === false) {
          const chainName = sluggifyString(transformNewChainName(protocol.chain));

          if (chainCoingeckoIds[chainName] == null || sluggifyString(chainName) !== chain) {
            return;
          }

          sum(sumCategoryOrTagTvls, "tvl", timestamp, item.tvl);

          // doublecounted and liquid staking values === sum of tvl on the chain this protocol exists
          if (protocol.doublecounted) {
            sum(sumCategoryOrTagTvls, "doublecounted", timestamp, item.tvl);
          }
          if (protocol.category?.toLowerCase() === "liquid staking") {
            sum(sumCategoryOrTagTvls, "liquidstaking", timestamp, item.tvl);
          }

          if (protocol.category?.toLowerCase() === "liquid staking" && protocol.doublecounted) {
            sum(sumCategoryOrTagTvls, "dcAndLsOverlap", timestamp, item.tvl);
          }
        }
      }
    },
    { includeBridge: false }
  );

  return sumCategoryOrTagTvls;
}

export async function getCategoryChartByChainData(req: HyperExpress.Request, res: HyperExpress.Response) {
  const category = req.path_parameters.category ? sluggifyString(req.path_parameters.category) : null;
  const chain = req.path_parameters.chain ? sluggifyString(req.path_parameters.chain) : null;

  if (!category) return errorResponse(res, "Data not found", { statusCode: 404 });

  const data = await getCategoryOrTagByChain({ category, chain });

  if (!data) {
    return errorResponse(res, "Data not found", { statusCode: 404 });
  }

  return successResponse(res, data);
}

export async function getTagChartByChainData(req: HyperExpress.Request, res: HyperExpress.Response) {
  const tag = req.path_parameters.tag ? sluggifyString(req.path_parameters.tag) : null;
  const chain = req.path_parameters.chain ? sluggifyString(req.path_parameters.chain) : null;

  if (!tag) return errorResponse(res, "Data not found", { statusCode: 404 });

  const data = await getCategoryOrTagByChain({ tag, chain });

  if (!data) {
    return errorResponse(res, "Data not found", { statusCode: 404 });
  }

  res.setHeaders({
    Expires: get20MinDate(),
  });

  return successResponse(res, data);
}
