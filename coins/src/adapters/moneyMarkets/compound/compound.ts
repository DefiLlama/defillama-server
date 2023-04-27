const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { wrappedGasTokens } from "../../utils/gasTokens";
import {
  addToDBWritesList,
  getTokenAndRedirectData,
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, Price, CoinData } from "../../utils/dbInterfaces";
import { Result } from "../../utils/sdkInterfaces";
import getBlock from "../../utils/block";

interface CToken {
  symbol: string;
  address: string;
  underlying: string;
}

async function getcTokens(
  chain: string,
  comptroller: string,
  block: number | undefined,
) {
  const markets: string[] = (
    await call({
      target: comptroller,
      abi: abi.getAllMarkets,
      chain: chain as any,
      block,
    })
  ).output;

  const [{ output: symbols }, { output: underlyings }] = await Promise.all([
    multiCall({
      calls: markets.map((m: string) => ({
        target: m,
      })),
      abi: "erc20:symbol",
      chain: chain as any,
      block,
    }),
    multiCall({
      calls: markets.map((m: string) => ({
        target: m,
      })),
      abi: abi.underlying,
      chain: chain as any,
      block,
      permitFailure: true,
    }),
  ]);

  let cTokenData = markets.map((m: string, i: number) => ({
    symbol: symbols[i].output,
    underlying:
      underlyings[i].output != null
        ? underlyings[i].output.toLowerCase()
        : wrappedGasTokens[chain],
    address: m.toLowerCase(),
  }));

  return cTokenData.filter((c: CToken) => c.underlying != null);
}

export default async function getTokenPrices(
  chain: string,
  comptroller: string,
  timestamp: number,
) {
  const block: number | undefined = await getBlock(chain, timestamp);

  const cTokens: CToken[] = await getcTokens(chain, comptroller, block);

  const coinsData: CoinData[] = await getTokenAndRedirectData(
    cTokens.map((c: CToken) => c.underlying),
    chain,
    timestamp,
  );

  const [
    tokenInfo,
    { output: underlyingDecimals },
    { output: exchangeRates },
  ] = await Promise.all([
    getTokenInfo(
      chain,
      cTokens.map((c: CToken) => c.address),
      block,
    ),
    multiCall({
      calls: cTokens.map((c: CToken) => ({
        target: c.underlying,
      })),
      abi: "erc20:decimals",
      chain: chain as any,
      block,
      permitFailure: true,
    }),
    multiCall({
      calls: cTokens.map((c: CToken) => ({
        target: c.address,
      })),
      abi: abi.exchangeRateStored,
      chain: chain as any,
      block,
    }),
  ]);

  const unknownTokens = [];
  const prices: Price[] = [];

  cTokens.map((t: CToken, i: number) => {
    try {
      const coinData: CoinData | undefined = coinsData.find(
        (c: CoinData) => c.address == t.underlying,
      );
      if (coinData == null || underlyingDecimals[i].output == null) return;
      prices.push({
        address: t.address,
        price: coinData.price * exchangeRates[i].output,
      });
    } catch {
      unknownTokens.push(t.underlying);
    }
  });

  let writes: Write[] = [];

  prices.map((p: Price) => {
    const i = tokenInfo.decimals
      .map((d: Result) => d.input.target)
      .indexOf(p.address);
    addToDBWritesList(
      writes,
      chain,
      cTokens[i].address,
      p.price / 10 ** (10 + Number(underlyingDecimals[i].output)),
      tokenInfo.decimals[i].output,
      tokenInfo.symbols[i].output,
      timestamp,
      "compound",
      1,
    );
  });

  return writes;
}
