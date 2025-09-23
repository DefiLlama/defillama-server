import PromisePool from "@supercharge/promise-pool";
import { FinalChainData, FinalData } from "./types";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import { getChainDisplayName } from "../src/utils/normalizeChain";
import { storeR2JSONString } from "../src/utils/r2";
import { getCurrentUnixTimestamp } from "../src/utils/date";

export async function saveRawBridgedTvls(chains: FinalData, symbolMap: { [pk: string]: string | null }) {
  const chainQueries: { [chain: string]: string[] } = {};
  Object.keys(symbolMap).filter((pk) => {
    if (symbolMap[pk] != null) return;
    const [chain, address] = pk.split(":");
    if (!chainQueries[chain]) chainQueries[chain] = [];
    chainQueries[chain].push(address);
  });

  await PromisePool.withConcurrency(5)
    .for(Object.keys(chainQueries))
    .process((chain: string) =>
      multiCall({
        calls: chainQueries[chain].map((target) => ({ target })),
        abi: "erc20:symbol",
        chain,
      })
        .then((res) =>
          res.map((symbol, i) => {
            symbolMap[`${chain}:${chainQueries[chain][i]}`] = symbol;
          })
        )
        .catch((e) => {
          e;
        })
    )
    .catch((e) => {
      e;
    });

  const invertedMap: { [chain: string]: { [symbol: string]: string } } = {};
  Object.keys(symbolMap).map((pk) => {
    const symbol = symbolMap[pk];
    if (symbol == null) return;
    const [chain, address] = pk.split(":");
    const displayName = getChainDisplayName(chain, true);
    if (!invertedMap[displayName]) invertedMap[displayName] = {};
    invertedMap[displayName][symbol] = address;
  });

  const rawBridgedTvls: any = {};
  Object.keys(chains).map((chain) => {
    rawBridgedTvls[chain] = { canonical: {}, thirdParty: {}, native: {}, ownTokens: {}, total: {} };
    Object.keys(chains[chain]).map((section: string) => {
      rawBridgedTvls[chain][section].total = chains[chain][section as keyof FinalChainData].total;
      rawBridgedTvls[chain][section].breakdown = {};
      Object.keys(chains[chain][section as keyof FinalChainData].breakdown).map((symbol: string) => {
        if (!invertedMap[chain]) return;
        const address = invertedMap[chain][symbol];
        if (!address) return;
        rawBridgedTvls[chain][section].breakdown[address] =
          chains[chain][section as keyof FinalChainData].breakdown[symbol];
      });
    });
  });

  rawBridgedTvls.timestamp = getCurrentUnixTimestamp();
  await storeR2JSONString("chainAssetsRaw", JSON.stringify(rawBridgedTvls));
}
