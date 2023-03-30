import { chainCoingeckoIds } from "./utils/normalizeChain";
import fetch from "node-fetch";
import { LiteProtocol } from "./types";
import { errorResponse, successResponse, wrap } from "./utils/shared";
import { coingeckoRequest } from "./utils/shared/coingeckoLocks";

interface IResponse {
  chains: string[];
  protocols: LiteProtocol[];
}

interface IChainGroups {
  [parent: string]: {
    [type: string]: string[];
  };
}

interface INumOfProtocolsPerChain {
  [protocol: string]: number;
}

interface IExtraPropPerChain {
  [chain: string]: {
    [prop: string]: {
      tvl: number;
      tvlPrevDay?: number;
      tvlPrevWeek?: number;
      tvlPrevMonth?: number;
    };
  };
}

export const getPrevTvlFromChart = (chart: any, daysBefore: number) => {
  return chart[chart.length - 1 - daysBefore]?.[1] ?? null;
};

export const getPercentChange = (valueNow: string, value24HoursAgo: string) => {
  const adjustedPercentChange =
    ((parseFloat(valueNow) - parseFloat(value24HoursAgo)) / parseFloat(value24HoursAgo)) * 100;
  if (isNaN(adjustedPercentChange) || !isFinite(adjustedPercentChange)) {
    return null;
  }
  return adjustedPercentChange;
};

const formattedChains = async (category: string) => {
  const res: IResponse = await fetch("https://api.llama.fi/lite/protocols2").then((res) => res.json());

  // get all chains by parent and not include them in categories below as we don't want to show these links, but user can access with url
  const chainsByParent: string[] = [];

  // get all unique categories from api
  let categories: string[] = [];
  for (const chain in chainCoingeckoIds) {
    chainCoingeckoIds[chain].categories?.forEach((cat) => {
      if (!categories.includes(cat)) {
        categories.push(cat);
      }
    });

    const parentChain = chainCoingeckoIds[chain].parent?.chain;

    if (parentChain && !chainsByParent.includes(parentChain)) {
      chainsByParent.push(parentChain);
    }
  }

  // check if category exists
  const categoryExists =
    categories.includes(category) || category === "All" || category === "Non-EVM" || chainsByParent.includes(category);

  // return if category not found
  if (!categoryExists) {
    return errorResponse({
      message: "Category is not in our database",
    });
  }

  // get all chains and filter them based on category
  const chainsUnique: string[] = res.chains.filter((t: string) => {
    const chainCategories = chainCoingeckoIds[t]?.categories ?? [];

    if (category === "All") {
      return true;
    } else if (category === "Non-EVM") {
      return !chainCategories.includes("EVM");
    } else if (categories.includes(category)) {
      return chainCategories.includes(category);
    } else {
      const parentChain = chainCoingeckoIds[t]?.parent?.chain;
      // filter chains like Polkadot and Kusama that are not defined as categories but can be accessed as from url
      return parentChain === category && chainsByParent.includes(parentChain);
    }
  });

  // group chains by parent like Ethereum -> [Arbitrum, Optimism] etc
  const chainsGroupbyParent: IChainGroups = {};
  chainsUnique.forEach((chain) => {
    const parent = chainCoingeckoIds[chain]?.parent;
    if (parent) {
      if (!chainsGroupbyParent[parent.chain]) {
        chainsGroupbyParent[parent.chain] = {};
      }
      for (const type of parent.types) {
        if (!chainsGroupbyParent[parent.chain][type]) {
          chainsGroupbyParent[parent.chain][type] = [];
        }
        chainsGroupbyParent[parent.chain][type].push(chain);
      }
    }
  });

  // get data of chains in given category
  const chainsData = await Promise.all(
    chainsUnique.map(async (elem: string) => {
      for (let i = 0; i < 5; i++) {
        try {
          return await fetch(`https://api.llama.fi/lite/charts/${elem}`).then((resp) => resp.json());
        } catch (e) {}
      }
      throw new Error(`https://api.llama.fi/lite/charts/${elem} is broken`);
    })
  );

  // get mcaps of chains in given category
  const chainMcaps = await coingeckoRequest(
    `simple/price?ids=${Object.values(chainCoingeckoIds)
      .map((v) => v.geckoId)
      .join(",")}&vs_currencies=usd&include_market_cap=true`
  );

  // calc no.of protocols present in each chains as well as extra tvl data like staking , pool2 etc
  const numOfProtocolsPerChain: INumOfProtocolsPerChain = {};
  const extraPropPerChain: IExtraPropPerChain = {};
  res.protocols.forEach((protocol: LiteProtocol) => {
    protocol.chains.forEach((chain) => {
      numOfProtocolsPerChain[chain] = (numOfProtocolsPerChain[chain] || 0) + 1;
    });
    Object.entries(protocol.chainTvls).forEach(([propKey, propValue]) => {
      if (propKey.includes("-")) {
        const prop = propKey.split("-")[1].toLowerCase();
        const chain = propKey.split("-")[0];
        if (extraPropPerChain[chain] === undefined) {
          extraPropPerChain[chain] = {};
        }
        extraPropPerChain[chain][prop] = {
          tvl: (propValue.tvl || 0) + (extraPropPerChain[chain][prop]?.tvl ?? 0),
          tvlPrevDay: (propValue.tvlPrevDay || 0) + (extraPropPerChain[chain][prop]?.tvlPrevDay ?? 0),
          tvlPrevWeek: (propValue.tvlPrevWeek || 0) + (extraPropPerChain[chain][prop]?.tvlPrevWeek ?? 0),
          tvlPrevMonth: (propValue.tvlPrevMonth || 0) + (extraPropPerChain[chain][prop]?.tvlPrevMonth ?? 0),
        };
      }
    });
  });

  // format chains data
  const tvlData = chainsData.map((d) => d.tvl);
  // data set for pie chart and table
  const chainTvls = chainsUnique
    .map((chainName, i) => {
      const tvl = getPrevTvlFromChart(tvlData[i], 0);
      const tvlPrevDay = getPrevTvlFromChart(tvlData[i], 1);
      const tvlPrevWeek = getPrevTvlFromChart(tvlData[i], 7);
      const tvlPrevMonth = getPrevTvlFromChart(tvlData[i], 30);
      const geckoId = chainCoingeckoIds[chainName]?.geckoId;
      const mcap = geckoId && chainMcaps[geckoId]?.usd_market_cap;
      const mcaptvl = mcap && tvl && mcap / tvl;

      return {
        tvl,
        tvlPrevDay,
        tvlPrevWeek,
        tvlPrevMonth,
        mcap: mcap || null,
        mcaptvl: mcaptvl || null,
        name: chainName,
        symbol: chainCoingeckoIds[chainName]?.symbol ?? "-",
        protocols: numOfProtocolsPerChain[chainName],
        extraTvl: extraPropPerChain[chainName] || {},
        change_1d: getPercentChange(tvl, tvlPrevDay),
        change_7d: getPercentChange(tvl, tvlPrevWeek),
        change_1m: getPercentChange(tvl, tvlPrevMonth),
      };
    })
    .sort((a, b) => b.tvl - a.tvl);

  const tvlTypes = {
    tvl: "t",
    borrowed: "b",
    pool2: "p",
    vesting: "v",
    staking: "s",
    doublecounted: "d",
    liquidstaking: "l",
    dcAndLsOverlap: "dl",
    offers: "o",
  } as {
    [name: string]: string;
  };
  const to2Digits = (n: number) => Number(n.toFixed(2));

  // format chains data to use in stacked area chart
  const stackedDataset = Object.entries(
    chainsData.reduce((total, chains, i) => {
      const chainName = chainsUnique[i];
      Object.entries(chains).forEach(([tvlType, values]: any) => {
        values.forEach((value: any) => {
          if (value[0] < 1596248105) return;
          if (total[value[0]] === undefined) {
            total[value[0]] = {};
          }
          const b = total[value[0]][chainName];
          const compressedType = tvlTypes[tvlType];
          if (compressedType !== undefined) {
            total[value[0]][chainName] = {
              ...b,
              [compressedType]: to2Digits(value[1]),
            };
          }
        });
      });
      return total;
    }, {})
  );

  return {
    chainsUnique,
    categories,
    chainTvls,
    stackedDataset,
    chainsGroupbyParent,
    tvlTypes, // Object.fromEntries(Object.entries(tvlTypes).map(t=>[t[1], t[0]])) // reverse object
  };
};

const handler = async (event: AWSLambda.APIGatewayEvent) => {
  const data = await formattedChains(event.pathParameters?.category ?? "");

  return successResponse(data, 10 * 60); // 10 mins cache
};

export default wrap(handler);
