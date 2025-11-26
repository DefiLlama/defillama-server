import { getLatestProtocolItems, initializeTVLCacheDB } from "../../src/api2/db";
import { hourlyRawTokensTvl } from "../utils/getLastRecord";
import { excludedTvlKeys, zero } from "../../l2/constants";
import BigNumber from "bignumber.js";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { coins } from "@defillama/sdk";
import { getCsvData } from "./csv";

const responseKey: string = 'Ticker'

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

  let aggregateRawtvls: { [pk: string]: { [id: string]: BigNumber} } = {};
  rawTvls.map((protocol: any) => {
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

async function main() {
  const parsedCsvData = getCsvData();
  const rwaTokens: { [protocol: string]: string[] } = {};
  let finalData: { [protocol: string]: { [key: string]: any } } = {};
  parsedCsvData.map((row: any) => {
      rwaTokens[`${row.projectID ? row.projectID : ''}-${row[responseKey]}`] = Array.isArray(row.Contracts) ? row.Contracts : [row.Contracts];
      finalData[`${row.projectID ? row.projectID : ''}-${row[responseKey]}`] = row;
  });
  const { tokensSortedByChain, tokenToProjectMap } = sortTokensByChain(rwaTokens);
  const aggregateRawTvls = await getAggregateRawTvls(tokensSortedByChain);
  const assetPrices = await coins.getPrices(Object.keys(tokenToProjectMap), "now");

  Object.keys(tokenToProjectMap).map((address: string) => {
    if (!assetPrices[address]) {
      console.error(`No price for ${tokenToProjectMap[address]} at ${address}`);
      return;
    }
  });

  getActiveTvls();

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

        if (aum.isLessThan(10)) return 
        const rwaId = tokenToProjectMap[pk];

        const [projectId, symbol] = rwaId.split('-');
        if (amountId == projectId) return;

        if (!finalData[rwaId]['Defi Active']) finalData[rwaId]['Defi Active'] = {}
        const chain = pk.substring(0, pk.indexOf(":"));
        if (!finalData[rwaId]['Defi Active'][chain]) finalData[rwaId]['Defi Active'][chain] = {};
      
        finalData[rwaId]['Defi Active'][chain][amountId] = aum.toFixed(0);
      });
    });
  }

  const filteredFinalData: any = {}
  Object.keys(finalData).map((rwaId: string) => {
    if (finalData[rwaId]['Defi Active']) {
      filteredFinalData[rwaId] = finalData[rwaId];
    }
  });

  return finalData;
}
main(); // ts-node defi/src/rwa/atvl.ts