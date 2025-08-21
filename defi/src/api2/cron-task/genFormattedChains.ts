import fetch from "node-fetch";
import { LiteProtocol } from "../../types";
import { chainCoingeckoIds } from "../../utils/normalizeChain";
import { readRouteData, storeRouteData } from "../cache/file-cache";

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

// get all chains by parent and not include them in categories below as we don't want to show these links, but user can access with url
const chainsByParent: Set<string> = new Set();

// get all unique categories from api
let categories: Set<string> = new Set();

const allChainData: any = {}


for (const chain in chainCoingeckoIds) {
  chainCoingeckoIds[chain].categories?.forEach((cat) => categories.add(cat));

  const parentChain = chainCoingeckoIds[chain].parent?.chain;

  if (parentChain)
    chainsByParent.add(parentChain);
}

const allCategories = Array.from(categories).concat(Array.from(chainsByParent))


let res: IResponse
let chainMcaps: any = {}

export async function genFormattedChains() {
  console.time('genFormattedChains')

  // fetch chain list
  res = await readRouteData('/lite/protocols2')

  // fetch all chain tvl data
  for (const chain of res.chains) {
    allChainData[chain] = { tvl: [] }
    try {
      const data = await readRouteData('/lite/charts/' + chain)
      if (!data) console.warn('No data for chain', chain)
      else allChainData[chain] = data
    } catch (e) {
      console.warn('Error fetching chain data for', chain)
    }
  }

  // fetch chain token prices
  chainMcaps = await fetch("https://coins.llama.fi/mcaps", {
    method: "POST",
    body: JSON.stringify({
      coins: Object.values(chainCoingeckoIds)
        .filter((c) => c.geckoId)
        .map((c) => `coingecko:${c.geckoId}`),
    }),
  })
    .then((r) => r.json())
    .catch((err) => {
      console.log(err);
      return {};
    });


  // generate route files
  const allData = getFormattedChains('All')
  await storeRouteData('/chains2/All', allData)

  for (const category of ['All', 'Non-EVM',].concat(allCategories)) {
    try {
      const categoryData = getFormattedChains(category)
      await storeRouteData('/chains2/' + category, categoryData)
    } catch (e: any) {
      console.error('Issue generating category data', category, e?.message ? e.message : e)
    }
  }

  console.timeEnd('genFormattedChains')
}

const getFormattedChains = (category: string) => {
  category = decodeURIComponent(category)


  // check if category exists
  const categoryExists = categories.has(category) || category === "All" || category === "Non-EVM" || chainsByParent.has(category);

  // return if category not found
  if (!categoryExists)
    throw new Error("Category is not in our database")

  // get all chains and filter them based on category
  const chainsUnique: string[] = res.chains.filter((t: string) => {
    const chainCategories = chainCoingeckoIds[t]?.categories ?? [];

    if (category === "All") {
      return true;
    } else if (category === "Non-EVM") {
      return !chainCategories.includes("EVM");
    } else if (categories.has(category)) {
      return chainCategories.includes(category);
    } else {
      const parentChain = chainCoingeckoIds[t]?.parent?.chain;
      // filter chains like Polkadot and Kusama that are not defined as categories but can be accessed as from url
      return parentChain === category && chainsByParent.has(parentChain);
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
  const chainsData = chainsUnique.map((chain: string) => allChainData[chain])


  // calc no.of protocols present in each chains as well as extra tvl data like staking , pool2 etc
  const numOfProtocolsPerChain: INumOfProtocolsPerChain = {};
  res.protocols.forEach((protocol: LiteProtocol) => {
    protocol.chains.forEach((chain) => {
      numOfProtocolsPerChain[chain] = (numOfProtocolsPerChain[chain] || 0) + 1;
    });
  });

  function getTvlAggData(allChainData: any, tvlField: string, withChangePercentage = false) {
    const tvlData = allChainData[tvlField]
    const tvl = getPrevTvlFromChart(tvlData, 0);
    const tvlPrevDay = getPrevTvlFromChart(tvlData, 1);
    const tvlPrevWeek = getPrevTvlFromChart(tvlData, 7);
    const tvlPrevMonth = getPrevTvlFromChart(tvlData, 30);
    const response: any = {
      tvl,
      tvlPrevDay,
      tvlPrevWeek,
      tvlPrevMonth,
    };
    if (withChangePercentage) {
      response.change_1d = getPercentChange(tvl, tvlPrevDay);
      response.change_7d = getPercentChange(tvl, tvlPrevWeek);
      response.change_1m = getPercentChange(tvl, tvlPrevMonth);
    }
    return response;
  }

  // data set for pie chart and table
  const chainTvls = chainsUnique
    .map((chainName, i) => {
      const data = chainsData[i];
      const tvlData = getTvlAggData(data, 'tvl', true)
      const geckoId = chainCoingeckoIds[chainName]?.geckoId;
      const mcap = geckoId && chainMcaps?.[`coingecko:${geckoId}`]?.mcap;
      const mcaptvl = mcap && tvlData.tvl && mcap / tvlData.tvl;
      const extraTvl: any = {}

      Object.keys(data).forEach((tvlType) => {
        if (tvlType === 'tvl') return; // skip tvl as it is already processed
        extraTvl[tvlType]= getTvlAggData(data, tvlType);
      })


      return {
        ...tvlData,
        mcap: mcap || null,
        mcaptvl: mcaptvl || null,
        name: chainName,
        symbol: chainCoingeckoIds[chainName]?.symbol ?? "-",
        protocols: numOfProtocolsPerChain[chainName],
        extraTvl,
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
    categories: allCategories,
    chainTvls,
    stackedDataset,
    chainsGroupbyParent,
    tvlTypes, // Object.fromEntries(Object.entries(tvlTypes).map(t=>[t[1], t[0]])) // reverse object
  };
};
