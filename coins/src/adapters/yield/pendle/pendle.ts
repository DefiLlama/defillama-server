import { ChainApi } from "@defillama/sdk";
import { getLogs } from "../../../utils/cache/getLogs";
import { CoinData, Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import PromisePool from "@supercharge/promise-pool";
import { wrappedGasTokens } from "../../utils/gasTokens";
import { nullAddress } from "../../../utils/shared/constants";
import { getConfig } from "../../../utils/cache";

export default async function getTokenPrices(
  timestamp: number,
  chain: string,
  config: {pendleOracle: string},
): Promise<Write[]> {
  const writes: Write[] = [];
  const { pendleOracle } = config;
  const api: ChainApi = await getApi(chain, timestamp);

  const allTokenInfos = await getAllTokenInfos(api.getChainId()!)
  const allYieldTokens: string[] = await api.multiCall({
    abi: "function yieldToken() view returns (address)",
    calls: allTokenInfos.map((i) => i.sy),
    permitFailure: true,
  }).then((r: any[]) => r.map((i: any) => i.toLowerCase()));

  const { scaleMapping, aaveTokens } = await getYieldTokenInfo(api, allYieldTokens);

  const allSyRates = await api.multiCall({
    abi: "function exchangeRate() view returns (uint256)",
    calls: allTokenInfos.map((i) => i.sy),
    permitFailure: true,
  }).then((r: any[]) => r.map((i: any) => Number(i) / 1e18));

  const allAssetInfos = await api.multiCall({
    abi: "function assetInfo() view returns (uint8 assetType, address assetAddress, uint8 assetDecimals)",
    calls: allTokenInfos.map((i) => i.sy),
    permitFailure: true,
  }).then((r: any[]) => r.map((i: any) => ({
    assetType: i.assetType,
    assetAddress: i.assetAddress.toLowerCase(),
    assetDecimals: i.assetDecimals,
    })));

  const allSyDecimals = await api.multiCall({
    abi: "uint8:decimals",
    calls: allTokenInfos.map((i) => i.sy),
    permitFailure: true,
  });

  const yieldTokenDataArray: CoinData[] = await getTokenAndRedirectData(
    [
      ...new Set(
        allYieldTokens.map((t) => scaleMapping.has(t) ? scaleMapping.get(t) : t).concat(
          allAssetInfos.map((info: any) => info.assetAddress
        )
      ))
    ].filter((t) => t != null),
    chain,
    timestamp
  )

  const allSyPrices = allYieldTokens.map((t: string, i: number) => {
    const remap = scaleMapping.get(t) ?? t;
    const data = yieldTokenDataArray.find((d: CoinData) => d.address === remap);

    if (!data) {

      const dataAsset = yieldTokenDataArray.find((d: CoinData) => d.address === allAssetInfos[i].assetAddress);
      if (!dataAsset) {
        return undefined;
      }

      const rateFloat = allSyRates[i] * (10 ** allSyDecimals[i]) / (10 ** dataAsset.decimals);
      return dataAsset.price * rateFloat;
    }

    
    if (aaveTokens.has(t)) {
      return data.price * allSyRates[i];
    }
    else {
      return data.price;
    }
  })

  const allTokenSymbols = await api.multiCall({
    abi: "erc20:symbol",
    calls: allTokenInfos.map((i) => i.sy).concat(allTokenInfos.map((i) => i.pt)).concat(allTokenInfos.map((i) => i.lp)).concat(allTokenInfos.map((i) => i.yt)),
    permitFailure: true,
  });

  async function syWrites() {
    const symbols: string[] = allTokenSymbols.slice(0, allTokenInfos.length);
    allTokenInfos.map((info, i: number) => {
      if (!allSyPrices[i]) return;
      addToDBWritesList(
        writes,
        chain,
        info.sy,
        allSyPrices[i],
        allSyDecimals[i],
        symbols[i],
        timestamp,
        "pendle-sy",
        1,
        undefined,
      );
    });
  }

  async function ptWrites() {
    const symbols: string[] = allTokenSymbols.slice(allTokenInfos.length, allTokenInfos.length * 2);
    const allPtRates = await api.multiCall({
      abi: "function getPtToSyRate(address, uint32) external view returns (uint256)",
      calls: allTokenInfos.map((i) => ({
        target: pendleOracle,
        params: [i.lp, 0]
      })),
      permitFailure: true,
    })

    allTokenInfos.map((info, i: number) => {
      if (!allSyPrices[i] || !allPtRates[i]) return;
      const ptPrice = allSyPrices[i] * (allPtRates[i] * (10 ** allAssetInfos[i].assetDecimals) / (10 ** allSyDecimals[i])) / 1e18; 
      addToDBWritesList(
        writes,
        chain,
        info.pt,
        ptPrice,
        allAssetInfos[i].assetDecimals,
        symbols[i],
        timestamp,
        "pendle-pt",
        0.9,
        undefined,
      );
    }) 
  }

  async function lpWrites() {
    const symbols: string[] = allTokenSymbols.slice(allTokenInfos.length * 2, allTokenInfos.length * 3);
    const allLpRates = await api.multiCall({
      abi: "function getLpToSyRate(address, uint32) external view returns (uint256)",
      calls: allTokenInfos.map((i) => ({ target: pendleOracle, params: [i.lp, 0] })),
      permitFailure: true,
    });

    allTokenInfos.map((info, i: number) => {
      if (!allSyPrices[i] || !allLpRates[i]) return;
      const lpPrice = allSyPrices[i] * (allLpRates[i] / (10 ** allSyDecimals[i]));

      addToDBWritesList(
        writes,
        chain,
        info.lp,
        lpPrice,
        18,
        symbols[i],
        timestamp,
        "pendle-lp",
        0.9,
        undefined,
      );
    });
  }

  async function ytWrites() {
    const symbols: string[] = allTokenSymbols.slice(allTokenInfos.length * 3, allTokenInfos.length * 4);
    const allYtRates = await api.multiCall({
      abi: "function getYtToSyRate(address, uint32) external view returns (uint256)",
      calls: allTokenInfos.map((i) => ({
        target: pendleOracle,
        params: [i.lp, 0]
      })),
      permitFailure: true,
    });
    
    allTokenInfos.map((info, i: number) => {
      if (!allSyPrices[i] || !allYtRates[i]) return;

      const ytPrice = allSyPrices[i] * (allYtRates[i] * (10 ** allAssetInfos[i].assetDecimals) / (10 ** allSyDecimals[i])) / 1e18;
      
      addToDBWritesList(
        writes,
        chain,
        info.yt,
        ytPrice,
        allAssetInfos[i].assetDecimals,
        symbols[i],
        timestamp,
        "pendle-yt",
        0.9,
        undefined,
      );
    });
  }

  await Promise.all([syWrites(), ptWrites(), lpWrites(), ytWrites()]);
  return writes;
}

async function getYieldTokenInfo(api: ChainApi, allYieldTokens: string[]): Promise<{
  scaleMapping: Map<string, string>,
  aaveTokens: Set<string>,
}> {
  const scaleMapping = new Map<string, string>();
  const aaveTokens = new Set<string>();

  const allYieldTokensNames: string[] = await api.multiCall({
    abi: "function name() view returns (string)",
    calls: allYieldTokens,
    permitFailure: true,
  });

  const scaledIndexes: number[] = []; 
  allYieldTokensNames.forEach((name: string, i: number) => {
    if (name.includes("scaled")) {
      scaledIndexes.push(i);
    }
    if (name.toLowerCase().includes("aave")) {
      aaveTokens.add(allYieldTokens[i]);
    }
  });

  const rawTokens: string[] = await api.multiCall({
    abi: "function rawToken() external view returns (address)",
    calls: scaledIndexes.map((i: number) => allYieldTokens[i]),
    permitFailure: true,
  }).then((r: any[]) => r.map((i: any) => i.toLowerCase()));

  scaledIndexes.forEach((scaledIndex: number, i: number) => {
    if (rawTokens[i]) {
      scaleMapping.set(allYieldTokens[scaledIndex], rawTokens[i]);
    }}
  )
  return { scaleMapping, aaveTokens };
}

async function getAllTokenInfos(chainId: number) {
  const markets: {
    lp: string;
    sy: string;
    pt: string;
    yt: string;
  }[] = [];

  function formatPendleAddr(rawAddr: string): string {
    return rawAddr.split('-')[1];
  }

  {
    const resp = await getConfig(`pendle-v2/active-markets-${chainId}`, `https://api-v2.pendle.finance/core/v1/${chainId}/markets/active`)
    markets.push(
      ...resp.markets.map((m: any) => ({
        lp: m.address,
        sy: formatPendleAddr(m.sy),
        pt: formatPendleAddr(m.pt),
        yt: formatPendleAddr(m.yt),
      }))
    )
  }

  {
    const resp = await getConfig(`pendle-v2/inactive-markets-${chainId}`, `https://api-v2.pendle.finance/core/v1/${chainId}/markets/inactive`)
    markets.push(
      ...resp.markets.map((m: any) => ({
        lp: m.address,
        sy: formatPendleAddr(m.sy),
        pt: formatPendleAddr(m.pt),
        yt: formatPendleAddr(m.yt),
      }))
    )
  }
  return markets;
}