import { getLatestProtocolItems, initializeTVLCacheDB } from "../../src/api2/db";
import { hourlyRawTokensTvl } from "../utils/getLastRecord";
import { excludedTvlKeys, zero } from "../../l2/constants";
import BigNumber from "bignumber.js";
import { chainsThatShouldNotBeLowerCased } from "../utils/shared/constants";
import { coins } from "@defillama/sdk";

const rwaTokens: { [protocol: string]: string[] } = {
  "4133": [
    "ethereum:0x9d39a5de30E57443bff2a8307A4256c8797a3497",
    "plasma:0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
    "solana:Eh6XEPhSwoLv5wFApukmnaVSHQ6sAnoD9BmgmwQoN2sN",
  ],
  "100001": [
    "ethereum:0x5a0f93d040de44e78f251b03c43be9cf317dcf64",
    "base:0x5a0f93d040de44e78f251b03c43be9cf317dcf64",
    "avax:0x5a0f93d040de44e78f251b03c43be9cf317dcf64", 
    "bsc:0x58f93d6b1ef2f44ec379cb975657c132cbed3b6b"
  ]
};

function sortTokensByChain(tokens: { [protocol: string]: string[] }) {
  const tokensSortedByChain: { [chain: string]: string[] } = {};
  const tokenToProjectMap: { [token: string]: string } = {};

  Object.keys(tokens).map((protocol: string) => {
    tokens[protocol].map((pk: string) => {
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

  let aggregateRawtvls: { [pk: string]: BigNumber } = {};
  rawTvls.map((protocol: any) => {
    Object.keys(protocol.data).map((chain: string) => {
      if (excludedTvlKeys.includes(chain)) return;
      if (!rwaTokens[chain]) return;

      Object.keys(protocol.data[chain]).map((pk: string) => {
        if (!rwaTokens[chain].includes(pk)) return;
        const tokenAmount: string = protocol.data[chain][pk];
        if (!aggregateRawtvls[pk]) aggregateRawtvls[pk] = zero;
        aggregateRawtvls[pk] = aggregateRawtvls[pk].plus(tokenAmount);
      });
    });
  });

  return aggregateRawtvls;
}

async function main() {
  const { tokensSortedByChain, tokenToProjectMap } = sortTokensByChain(rwaTokens);
  const aggregateRawTvls = await getAggregateRawTvls(tokensSortedByChain);
  const assetPrices = await coins.getPrices(Object.keys(aggregateRawTvls), "now");
  const activeTvls: { [protocol: string]: { [chain: string]: string } } = {};

  getActiveTvls();

  function getActiveTvls() {
    Object.keys(aggregateRawTvls).map((pk: string) => {
      if (!assetPrices[pk]) {
        console.error(`No price for ${pk}`);
        return;
      }

      const { price, decimals } = assetPrices[pk];
      const amount = aggregateRawTvls[pk];

      const aum = amount.times(price).div(10 ** decimals);
      const protocol = tokenToProjectMap[pk];

      if (!activeTvls[protocol]) activeTvls[protocol] = {};

      const chain = pk.substring(0, pk.indexOf(":"));
      activeTvls[protocol][chain] = aum.toFixed(0);
    });

    return activeTvls;
  }

  return activeTvls;
}
main(); // ts-node defi/src/rwa/atvl.ts

const res = {
    "4133": {
      ethereum: "2641803784",
      plasma: "1077200339",
      solana: "173965",
    },
    "100001": {
      ethereum: "2516674",
    },
  }