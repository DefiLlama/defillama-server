import { getLatestProtocolItems, initializeTVLCacheDB } from "../../src/api2/db";
import { dailyRawTokensTvl, hourlyRawTokensTvl } from "../utils/getLastRecord";
import { excludedTvlKeys } from "../../l2/constants";
import BigNumber from "bignumber.js";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { coins } from "@defillama/sdk";
import { getCsvData } from "./csv";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { fetchSupplies } from "../../l2/utils";
import { storeR2JSONString } from "../utils/r2";
import { getChainDisplayName } from "../utils/normalizeChain";
import { cachedFetch } from "@defillama/sdk/build/util/cache";
import { getCurrentUnixTimestamp, getTimestampAtStartOfDay } from "../utils/date";
import { storeHistorical, protocolIdMap } from "./historical";

const excludedProtocolCategories: string[] = ["CEX"];
const keyMap: { [value: string]: string } = {
  coingeckoId: "*Coingecko ID",
  onChain: "onChainMarketcap",
  defiActive: "defiActiveTvl",
  excluded: "*",
};

function sortTokensByChain(tokens: { [protocol: string]: string[] }) {
  const tokensSortedByChain: { [chain: string]: string[] } = {};
  const tokenToProjectMap: { [token: string]: string } = {};

  Object.keys(tokens).map((protocol: string) => {
    tokens[protocol].map((pk: any) => {
      if (pk == false) return;
      const chain = pk.substring(0, pk.indexOf(":"));

      if (!tokensSortedByChain[chain]) tokensSortedByChain[chain] = [];
      const normalizedPk = chainsThatShouldNotBeLowerCased.includes(chain) ? pk : pk.toLowerCase();

      tokensSortedByChain[chain].push(normalizedPk);
      tokenToProjectMap[normalizedPk] = protocol;
    });
  });

  return { tokensSortedByChain, tokenToProjectMap };
}

function toCamelCase(str: string) {
  return str
    .toLowerCase()
    .replace(/\//g, " ")
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
}

async function getAggregateRawTvls(rwaTokens: { [chain: string]: string[] }, timestamp: number) {
  await initializeTVLCacheDB();

  const rawTvls = await getLatestProtocolItems(timestamp == 0 ? hourlyRawTokensTvl : dailyRawTokensTvl, {
    filterLast24Hours: true,
    timestampTo: timestamp == 0 ? undefined : timestamp,
  });

  let aggregateRawTvls: { [pk: string]: { [id: string]: BigNumber } } = {};
  rawTvls.map((protocol: any) => {
    if (excludedProtocolCategories.includes(protocol.category)) return;
    Object.keys(protocol.data).map((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!rwaTokens[chain]) return;

      Object.keys(protocol.data[chain]).map((pk: string) => {
        if (!rwaTokens[chain].includes(pk)) return;
        if (!aggregateRawTvls[pk]) aggregateRawTvls[pk] = {};
        aggregateRawTvls[pk][protocol.id] = BigNumber(protocol.data[chain][pk]);
      });
    });
  });

  return aggregateRawTvls;
}

// async function backfillRawTvls(timestampFrom: number, timestampTo: number) {
//   const rawTvls = await getAllItems(dailyRawTokensTvl, { timestampBefore: timestampTo, timestampAfter: timestampFrom })
//   return rawTvls
// }

async function getTotalSupplies(tokensSortedByChain: { [chain: string]: string[] }, timestamp: number) {
  const totalSupplies: { [token: string]: number } = {};

  await runInPromisePool({
    items: Object.keys(tokensSortedByChain),
    concurrency: 5,
    processor: async (chain: string) => {
      const tokens: string[] = [];
      tokensSortedByChain[chain].map((token: string) => {
        tokens.push(token.substring(token.indexOf(":") + 1));
      });

      try {
        const res = await fetchSupplies(chain, tokens, timestamp == 0 ? undefined : timestamp);
        Object.keys(res).map((token: string) => {
          totalSupplies[token] = res[token];
        });
      } catch (e) {
        console.error(`Failed to fetch supplies for ${chain}: ${e}`);
      }
    },
  });

  return totalSupplies;
}

async function fetchStablecoins(timestamp: number): Promise<{ [gecko_id: string]: { [chain: string]: number } }> {
  const validStablecoinIds: string[] = [];
  const { peggedAssets } = await cachedFetch({
    key: "stablecoin-symbols",
    endpoint: "https://stablecoins.llama.fi/stablecoins",
  });

  const data: { [gecko_id: string]: { [chain: string]: number } } = {};
  peggedAssets.map((coin: any) => {
    const { id, chainCirculating, gecko_id, pegType } = coin;
    if (!chainCirculating || !gecko_id || !pegType) return;
    data[gecko_id] = {};
    Object.keys(chainCirculating).map((chain: string) => {
      const circulating = chainCirculating[chain].current;
      if (!circulating) return;
      const mcap = circulating[pegType];
      if (!mcap) return;
      validStablecoinIds.push(id);
      data[gecko_id][chain] = mcap.toFixed(0);
    });
  });

  if (timestamp != 0) return await fetchHistoricalStablecoins(timestamp, validStablecoinIds);

  return data;
}

async function fetchHistoricalStablecoins(
  timestamp: number,
  validStablecoinIds: string[]
): Promise<{ [gecko_id: string]: { [chain: string]: number } }> {
  const data: { [gecko_id: string]: { [chain: string]: number } } = {};

  await runInPromisePool({
    items: validStablecoinIds,
    concurrency: 5,
    processor: async (id: string) => {
      const apiData = await cachedFetch({
        key: `stablecoin-historical-${id}`,
        endpoint: `https://stablecoins.llama.fi/stablecoin/${id}`,
      });
      if (!apiData) return;

      const { chainBalances, gecko_id, pegType } = apiData;

      data[gecko_id] = {};
      Object.keys(chainBalances).map((chain: string) => {
        const timeseries = chainBalances[chain].tokens;
        const entry = timeseries.find((t: any) => t.date == timestamp);
        if (!entry) return;
        const circulating = entry.circulating;
        if (!circulating) return;
        const mcap = circulating[pegType];
        if (!mcap) return;
        data[gecko_id][chain] = mcap.toFixed(0);
      });
    },
  });

  return data;
}

function getActiveTvls(
  assetPrices: any,
  tokenToProjectMap: any,
  finalData: any,
  protocolIdMap: any,
  aggregateRawTvls: any
) {
  Object.keys(aggregateRawTvls).map((pk: string) => {
    if (!assetPrices[pk]) {
      console.error(`No price for ${pk}`);
      return;
    }

    const { price, decimals } = assetPrices[pk];
    const amounts = aggregateRawTvls[pk];

    Object.keys(amounts).map((amountId: string) => {
      const amount = amounts[amountId];
      const aum = amount.times(price).div(10 ** decimals);

      if (aum.isLessThan(10)) return;
      const rwaId = tokenToProjectMap[pk];

      const [projectId, symbol] = rwaId.split("-");
      if (amountId == projectId) return;

      try {
        const projectName = protocolIdMap[amountId];
        if (!projectName) return;

        if (!finalData[rwaId][keyMap.defiActive]) finalData[rwaId][keyMap.defiActive] = {};
        const chain = pk.substring(0, pk.indexOf(":"));
        const chainDisplayName = getChainDisplayName(chain, true);
        if (!finalData[rwaId][keyMap.defiActive][chainDisplayName])
          finalData[rwaId][keyMap.defiActive][chainDisplayName] = {};
        finalData[rwaId][keyMap.defiActive][chainDisplayName][projectName] = aum.toFixed(0);
      } catch (e) {
        console.error(`Malformed ${keyMap.defiActive} for ${rwaId}: ${e}`);
      }
    });
  });
}

function getOnChainTvls(
  assetPrices: any,
  tokenToProjectMap: any,
  finalData: any,
  parsedCsvData: any,
  stablecoinsData: any,
  totalSupplies: any
) {
  Object.keys(assetPrices).map((pk: string) => {
    const rwaId = tokenToProjectMap[pk];
    const cgId = parsedCsvData[rwaId][keyMap.coingeckoId];

    if (cgId && stablecoinsData[cgId]) {
      finalData[rwaId][keyMap.onChain] = stablecoinsData[cgId];
      return;
    }

    const { price, decimals, timestamp } = assetPrices[pk];
    const supply = totalSupplies[pk];
    if (!supply || !price) {
      console.error(`No supply or price for ${pk}`);
      return;
    }

    try {
      if (!finalData[rwaId][keyMap.onChain]) finalData[rwaId][keyMap.onChain] = {};
      const chain = pk.substring(0, pk.indexOf(":"));
      const chainDisplayName = getChainDisplayName(chain, true);
      if (!finalData[rwaId][keyMap.onChain][chainDisplayName]) finalData[rwaId][keyMap.onChain][chainDisplayName] = {};

      const aum = (price * supply) / 10 ** decimals;
      finalData[rwaId][keyMap.onChain][chainDisplayName] = aum.toFixed(0);
    } catch (e) {
      console.error(`Malformed ${keyMap.onChain} for ${rwaId}: ${e}`);
    }
  });
}

async function main(ts: number = 0) {
  const timestamp = getTimestampAtStartOfDay(ts);
  const parsedCsvData = getCsvData();
  const rwaTokens: { [protocol: string]: string[] } = {};
  let finalData: { [protocol: string]: { [key: string]: any } } = {};
  const ids: string[] = [];

  parsedCsvData.map((row: any, i: number) => {
    const cleanRow: any = {};
    Object.keys(row).map((key: string) => {
      const camelKey = toCamelCase(key);
      if (key == "*projectID" && row[key].length > 0) ids.push(row.projectID);
      else if (key.startsWith(keyMap.excluded)) return;
      else if (key == "Contracts") {
        const contracts: { [chain: string]: string[] } = {};
        (Array.isArray(row[key]) ? row[key] : [row[key]]).map((contract: any) => {
          if (!contract) return;
          const chainRaw = contract.split(":")[0];
          const address = contract.substring(contract.indexOf(":") + 1);
          const chain = getChainDisplayName(chainRaw.toLowerCase(), true);
          if (!contracts[chain]) contracts[chain] = [];
          contracts[chain].push(address);
        });
        cleanRow[camelKey] = contracts;
      } else if (key == "Primary Chain") {
        cleanRow[camelKey] = row[key] ? getChainDisplayName(row[key].toLowerCase(), true) : null;
      } else if (key == "Chain")
        cleanRow[camelKey] = row[key]
          ? row[key].map((chain: string) => getChainDisplayName(chain.toLowerCase(), true))
          : null;
      else cleanRow[camelKey] = row[key] == "" ? null : row[key];
    });

    rwaTokens[i] = Array.isArray(row.Contracts) ? row.Contracts : [row.Contracts];
    finalData[i] = cleanRow;
  });

  Object.keys(finalData).map((rowIndex: string) => {
    let stablecoin = false;
    finalData[rowIndex].category.map((category: string) => {
      if (category.toLowerCase().includes("stablecoin")) stablecoin = true;
    });
    finalData[rowIndex].stablecoin = stablecoin;
  });

  const { tokensSortedByChain, tokenToProjectMap } = sortTokensByChain(rwaTokens);
  const assetPrices = await coins.getPrices(Object.keys(tokenToProjectMap), timestamp == 0 ? "now" : timestamp);
  const aggregateRawTvls = await getAggregateRawTvls(tokensSortedByChain, ts);
  const totalSupplies = await getTotalSupplies(tokensSortedByChain, timestamp);

  Object.keys(tokenToProjectMap).map((address: string) => {
    if (!assetPrices[address]) {
      console.error(`No price for ${tokenToProjectMap[address]} at ${address}`);
      return;
    }
  });

  const stablecoinsData = await fetchStablecoins(timestamp);
  getActiveTvls(assetPrices, tokenToProjectMap, finalData, protocolIdMap, aggregateRawTvls);
  getOnChainTvls(assetPrices, tokenToProjectMap, finalData, parsedCsvData, stablecoinsData, totalSupplies);

  const filteredFinalData: any = {};
  Object.keys(finalData).map((rwaId: string) => {
    if (
      typeof finalData[rwaId][keyMap.defiActive] === "object" &&
      typeof finalData[rwaId][keyMap.onChain] === "object"
    ) {
      filteredFinalData[rwaId] = finalData[rwaId];
    }
  });

  if (timestamp == 0) await storeR2JSONString("rwa/active-tvls", JSON.stringify(filteredFinalData));
  await storeHistorical(filteredFinalData, timestamp == 0 ? getCurrentUnixTimestamp() : timestamp);

  return finalData;
}

main(); // ts-node defi/src/rwa/atvl.ts
