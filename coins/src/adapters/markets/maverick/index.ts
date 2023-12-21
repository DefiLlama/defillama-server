import { multiCall } from "@defillama/sdk/build/abi/abi2";
import abi from "./abi.json";
import allContracts from "./contracts.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import getBlock from "../../utils/block";

export async function maverick(timestamp: number) {
  return Promise.all(
    Object.keys(allContracts).map((chain: string) =>
      getTokenPrices(chain, timestamp),
    ),
  );
}

async function getTokenPrices(chain: string, timestamp: number) {
  const contracts = allContracts[chain as keyof typeof allContracts];
  const block: number | undefined = await getBlock(chain, timestamp);
  const poolLength = Array.from(Array(Number(contracts.pools.length)).keys());

  function calculateUsdPrices() {
    poolLength.map((i: number) => {
      const aData = tokenData.find((d: CoinData) => d.address == tokenAs[i]);
      const bData = tokenData.find((d: CoinData) => d.address == tokenBs[i]);
      if (aData) {
        usdPrices[tokenAs[i]] = aData.price;
        usdPrices[tokenBs[i]] = (aData.price * sqrtPrices[i] ** 2) / 10 ** 36;
      }
      if (bData) {
        usdPrices[tokenBs[i]] = bData.price;
        usdPrices[tokenAs[i]] = (bData.price * 10 ** 36) / sqrtPrices[i] ** 2;
      }
    });
  }

  function calculateReserves() {
    return poolLength.map((i: number) => {
      if (!usdPrices[tokenAs[i]] || !usdPrices[tokenBs[i]]) return;
      return (
        usdPrices[tokenAs[i]] * reservesA[i] +
        usdPrices[tokenBs[i]] * reservesB[i]
      );
    });
  }

  function addToWrites(tokens: string[], i: number) {
    const token = tokens[i];
    const index = Object.keys(usdPrices).indexOf(token);
    addToDBWritesList(
      writes,
      chain,
      token,
      usdPrices[token],
      tokenInfo.decimals[index].output,
      tokenInfo.symbols[index].output,
      timestamp,
      "maverick",
      0.7,
    );
  }

  const [sqrtPrices, tokenAs, tokenBs] = await Promise.all([
    multiCall({
      abi: abi.getSqrtPrice,
      target: contracts.poolInfo,
      calls: contracts.pools.map((params: string) => ({
        params,
        target: contracts.poolInfo,
      })),
      chain,
      block,
    }),
    multiCall({
      abi: abi.tokenA,
      calls: contracts.pools.map((target: string) => ({ target })),
      chain,
      block,
    }).then((r: any) => r.map((t: string) => t.toLowerCase())),
    multiCall({
      abi: abi.tokenB,
      calls: contracts.pools.map((target: string) => ({ target })),
      chain,
      block,
    }).then((r: any) => r.map((t: string) => t.toLowerCase())),
  ]);

  const uniqueAssets = [...new Set([...tokenAs, ...tokenBs])];

  const [reservesA, reservesB, tokenData] = await Promise.all([
    multiCall({
      abi: "erc20:balanceOf",
      calls: contracts.pools.map((params: string, i: number) => ({
        target: tokenAs[i],
        params,
      })),
      chain,
      block,
    }),
    multiCall({
      abi: "erc20:balanceOf",
      calls: contracts.pools.map((params: string, i: number) => ({
        target: tokenBs[i],
        params,
      })),
      chain,
      block,
    }),
    getTokenAndRedirectData(uniqueAssets, chain, timestamp),
  ]);

  const usdPrices: { [asset: string]: number } = {};
  calculateUsdPrices();

  const reserves = calculateReserves();

  const tokenInfo = await getTokenInfo(chain, Object.keys(usdPrices), block);
  const liquidityThreshold = 1e6;

  const writes: Write[] = [];
  reserves.map((r: number | undefined, i: number) => {
    if (!r || r < liquidityThreshold) return;
    addToWrites(tokenAs, i);
    addToWrites(tokenBs, i);
  });

  return writes;
}
