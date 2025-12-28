import { getLatestProtocolItems, initializeTVLCacheDB } from "../../src/api2/db";
import { hourlyRawTokensTvl } from "../utils/getLastRecord";
import { excludedTvlKeys, zero } from "../../l2/constants";
import BigNumber from "bignumber.js";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { coins } from "@defillama/sdk";
import { getCsvData } from "./csv";
import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { fetchSupplies } from "../../l2/utils";
import { storeR2JSONString } from "../utils/r2";
import { getChainDisplayName } from "../utils/normalizeChain";

const defiActiveKey: string = "DeFi Active TVL";
const onChainKey: string = "On-chain TVL";
const excludedKeys: string = "*"; // starts with
const excludedProtocolCategories: string[] = ["CEX"];

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

async function getAggregateRawTvls(rwaTokens: { [chain: string]: string[] }) {
  await initializeTVLCacheDB();
  const rawTvls = await getLatestProtocolItems(hourlyRawTokensTvl, { filterLast24Hours: true });

  let aggregateRawtvls: { [pk: string]: { [id: string]: BigNumber } } = {};
  rawTvls.map((protocol: any) => {
    if (excludedProtocolCategories.includes(protocol.category)) return;
    Object.keys(protocol.data).map((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!rwaTokens[chain]) return;

      Object.keys(protocol.data[chain]).map((pk: string) => {
        if (!rwaTokens[chain].includes(pk)) return;
        if (!aggregateRawtvls[pk]) aggregateRawtvls[pk] = {};
        aggregateRawtvls[pk][protocol.id] = BigNumber(protocol.data[chain][pk]);
      });
    });
  });

  return aggregateRawtvls;
}

async function getTotalSupplies(tokensSortedByChain: { [chain: string]: string[] }) {
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
        const res = await fetchSupplies(chain, tokens, undefined);
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

async function main() {
  const parsedCsvData = getCsvData();
  const rwaTokens: { [protocol: string]: string[] } = {};
  let finalData: { [protocol: string]: { [key: string]: any } } = {};
  const ids: string[] = [];

  parsedCsvData.map((row: any, i: number) => {
    const cleanRow: any = {};
    Object.keys(row).map((key: string) => {
      if (key == "*projectID" && row[key].length > 0) ids.push(row.projectID);
      else if (key.startsWith(excludedKeys)) return;
      else if (key == "Primary Chain") {
        cleanRow[key] = row[key] ? getChainDisplayName(row[key].toLowerCase(), true) : null;
      } else if (key == "Chain")
        cleanRow[key] = row[key]
          ? row[key].map((chain: string) => getChainDisplayName(chain.toLowerCase(), true))
          : null;
      else cleanRow[key] = row[key] == "" ? null : row[key];
    });

    rwaTokens[i] = Array.isArray(row.Contracts) ? row.Contracts : [row.Contracts];
    finalData[i] = cleanRow;
  });

  Object.keys(finalData).map((rowIndex: string) => {
    let stablecoin = false;
    finalData[rowIndex].Category.map((category: string) => {
      if (category.toLowerCase().includes("stablecoin")) stablecoin = true;
    });
    finalData[rowIndex].stablecoin = stablecoin
  });

  const { tokensSortedByChain, tokenToProjectMap } = sortTokensByChain(rwaTokens);
  const aggregateRawTvls = await getAggregateRawTvls(tokensSortedByChain);
  const totalSupplies = await getTotalSupplies(tokensSortedByChain);
  const assetPrices = await coins.getPrices(Object.keys(tokenToProjectMap), "now");

  Object.keys(tokenToProjectMap).map((address: string) => {
    if (!assetPrices[address]) {
      console.error(`No price for ${tokenToProjectMap[address]} at ${address}`);
      return;
    }
  });

  getActiveTvls();
  getOnChainTvls();

  function getActiveTvls() {
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
          if (!finalData[rwaId][defiActiveKey]) finalData[rwaId][defiActiveKey] = {};
          const chain = pk.substring(0, pk.indexOf(":"));
          const chainDisplayName = getChainDisplayName(chain, true);

          if (!finalData[rwaId][defiActiveKey][chainDisplayName]) finalData[rwaId][defiActiveKey][chainDisplayName] = {};
          finalData[rwaId][defiActiveKey][chainDisplayName][amountId] = aum.toFixed(0);
        } catch (e) {
          console.error(`Malformed ${defiActiveKey} for ${rwaId}: ${e}`);
        }
      });
    });
  }

  function getOnChainTvls() {
    Object.keys(assetPrices).map((pk: string) => {
      const { price, decimals } = assetPrices[pk];
      const supply = totalSupplies[pk];
      if (!supply || !price) {
        console.error(`No supply or price for ${pk}`);
        return;
      }

      const rwaId = tokenToProjectMap[pk];

      try {
        if (!finalData[rwaId][onChainKey]) finalData[rwaId][onChainKey] = {};
        const chain = pk.substring(0, pk.indexOf(":"));
        const chainDisplayName = getChainDisplayName(chain, true);
        if (!finalData[rwaId][onChainKey][chainDisplayName]) finalData[rwaId][onChainKey][chainDisplayName] = {};

        const aum = (price * supply) / 10 ** decimals;
        finalData[rwaId][onChainKey][chainDisplayName] = aum.toFixed(0);
      } catch (e) {
        console.error(`Malformed ${onChainKey} for ${rwaId}: ${e}`);
      }
    });
  }

  const filteredFinalData: any = {};
  Object.keys(finalData).map((rwaId: string) => {
    if (typeof finalData[rwaId][defiActiveKey] === "object" && typeof finalData[rwaId][onChainKey] === "object") {
      filteredFinalData[rwaId] = finalData[rwaId];
    }
  });

  await storeR2JSONString("rwa/active-tvls", JSON.stringify(filteredFinalData));

  return finalData;
}

main(); // ts-node defi/src/rwa/atvl.ts
