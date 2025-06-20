import fetch from "node-fetch";
import { chainIdMap } from "../bridges/celer";
import getWrites from "../utils/getWrites";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import getBlock from "../utils/block";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";

type Pool = {
  address: string;
  lpt: Token;
};
type Token = {
  address: string;
  symbol: string;
  decimals: string;
};
type ApiData = {
  chainId: number;
  address: string;
  symbol: string;
  decimals: string;
  ibt: Token;
  underlying: Token;
  pools: Pool[];
};
type PriceData = {
  underlying: string;
  symbol: string;
  decimals: string;
  price?: number;
  pool?: string;
  pt?: string;
};
type Rate = { input: { target: string }; output: string; success: boolean };

const dataForLps: { [address: string]: { price: number; decimals: number } } =
  {};

async function buildPricesObject() {
  const pools = await fetch(
    `https://app.spectra.finance/api/v1/mainnet/pools`,
  ).then((r) => r.json());

  const prices: {
    [chain: string]: { [type: string]: { [address: string]: PriceData } };
  } = {};
  pools.map(
    ({
      ibt,
      chainId,
      underlying,
      address,
      symbol,
      decimals,
      pools,
    }: ApiData) => {
      const chain = chainIdMap[chainId];
      if (!chain) return;
      if (!(chain in prices)) prices[chain] = { ibt: {}, pt: {}, lp: {} };

      prices[chain].ibt[ibt.address] = {
        underlying: underlying.address,
        symbol: ibt.symbol,
        decimals: ibt.decimals,
      };
      prices[chain].pt[address] = {
        underlying: ibt.address,
        symbol,
        decimals,
        pool: pools[0].address,
      };
      pools.map((pool: Pool) => {
        prices[chain].lp[pool.lpt.address] = {
          underlying: ibt.address,
          symbol: "SPT-PT/IBT-f",
          decimals: pool.lpt.decimals,
          pt: address,
          pool: pool.address,
        };
      });
    },
  );

  return prices;
}
async function ibt(
  chain: string,
  block: number | undefined,
  timestamp: number,
  pricesObject: { [address: string]: PriceData },
  writes: Write[],
) {
  if (!Object.keys(pricesObject)) return;
  const [ibtRates]: [Rate[]] = await Promise.all([
    multiCall({
      chain,
      calls: Object.keys(pricesObject).map((target: any) => ({
        target,
        params: 1e12,
      })),
      abi: "function convertToAssets(uint256) external view returns (uint256)",
      block,
      permitFailure: true,
      withMetadata: true,
    }),
  ]);

  ibtRates.map((r: Rate) => {
    if (r.output == "1") return;
    const asset = r.input.target;
    const rate = Number(r.output) / 10 ** 12;
    pricesObject[asset].price = rate;
  });

  Object.keys(pricesObject).map((address: string) => {
    if (!pricesObject[address].price || !isFinite(pricesObject[address].price!))
      delete pricesObject[address];
  });

  await getWrites({
    chain,
    timestamp,
    pricesObject,
    projectName: "spectra-ibt",
    writes,
  });

  writes.map((w) => {
    const address = w.PK.substring(w.PK.indexOf(":") + 1).toLowerCase();
    if (!w.price) return;
    dataForLps[address] = { price: w.price, decimals: Number(w.decimals) };
  });
}
async function pt(
  chain: string,
  block: number | undefined,
  timestamp: number,
  pricesObject: { [address: string]: PriceData },
  writes: Write[],
) {
  const ptRates: Rate[] = await multiCall({
    chain,
    calls: Object.values(pricesObject).map(({ pool }) => ({
      target: pool,
    })),
    abi: "function last_prices() external view returns (uint256)",
    block,
    permitFailure: true,
    withMetadata: true,
  });

  const ibtPrices: { [pool: string]: number } = {};
  Object.keys(pricesObject).map((p: any) => {
    const ibt = pricesObject[p].underlying;
    const write = writes.find((w) => w.PK.includes(ibt.toLowerCase()));
    if (!write || !write.price) return;
    ibtPrices[p] = write.price;
  });

  ptRates.map(({ success, input, output }: Rate) => {
    if (!success) return;

    const pt = Object.keys(pricesObject).find(
      (pt: string) => pricesObject[pt].pool == input.target,
    );
    if (!pt) return;

    const price = (Number(output) / 1e18) * ibtPrices[pt];
    const { decimals, symbol } = pricesObject[pt];
    if (!price || !isFinite(price)) return;

    dataForLps[pt.toLowerCase()] = { price, decimals: Number(decimals) };
    addToDBWritesList(
      writes,
      chain,
      pt,
      price,
      Number(decimals),
      symbol,
      timestamp,
      "spectra-pt",
      1,
    );
  });
}
async function lp(
  chain: string,
  block: number | undefined,
  timestamp: number,
  pricesObject: { [address: string]: PriceData },
  writes: Write[],
) {
  const [ibtBalance, ptBalance, supply] = await Promise.all([
    multiCall({
      chain,
      calls: Object.keys(pricesObject).map((token: string) => ({
        target: pricesObject[token].underlying,
        params: pricesObject[token].pool,
      })),
      abi: "erc20:balanceOf",
      block,
      permitFailure: true,
    }),
    multiCall({
      chain,
      calls: Object.keys(pricesObject).map((token: string) => ({
        target: pricesObject[token].pt,
        params: pricesObject[token].pool,
      })),
      abi: "erc20:balanceOf",
      block,
      permitFailure: true,
    }),
    multiCall({
      chain,
      calls: Object.keys(pricesObject).map((target: string) => ({
        target,
      })),
      abi: "erc20:totalSupply",
      block,
      permitFailure: true,
    }),
  ]);

  function findSideValue(lpToken: string, i: number, isIbt: boolean) {
    const { underlying: ibt, pt } = pricesObject[lpToken];
    const token = isIbt ? ibt : pt;
    if (!token || !(token.toLowerCase() in dataForLps)) return NaN;

    const { price, decimals } = dataForLps[token.toLowerCase()];
    const balance = isIbt ? ibtBalance[i] : ptBalance[i];
    return (price * balance) / 10 ** Number(decimals);
  }

  Object.keys(pricesObject).map((token: string, i: number) => {
    const ibtValue = findSideValue(token, i, true);
    const ptValue = findSideValue(token, i, false);
    const price = ((ibtValue + ptValue) / supply[i]) * 1e18;
    if (isNaN(price) || !isFinite(price)) return;

    addToDBWritesList(
      writes,
      chain,
      token,
      price,
      Number(pricesObject[token].decimals),
      pricesObject[token].symbol,
      timestamp,
      "spectra-lp",
      1,
    );
  });
}
export async function spectra(timestamp: number): Promise<Write[]> {
  const prices = await buildPricesObject();

  const writes: Write[] = [];
  await Promise.all(
    Object.keys(prices).map(async (chain: string) => {
      const block = await getBlock(chain, timestamp);
      await ibt(chain, block, timestamp, prices[chain].ibt, writes);
      await pt(chain, block, timestamp, prices[chain].pt, writes);
      await lp(chain, block, timestamp, prices[chain].lp, writes);
    }),
  );

  return writes;
}
