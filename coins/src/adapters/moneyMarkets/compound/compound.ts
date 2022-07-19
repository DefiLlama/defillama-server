const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { batchWrite } from "../../../utils/shared/dynamodb";
import { wrappedGasTokens } from "../../utils/gasTokens";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { write, read, price } from "../../utils/dbInterfaces";
import { result } from "../../utils/sdkInterfaces";

interface cToken {
  symbol: string;
  address: string;
  underlying: string;
}

async function getcTokens(chain: string, comptroller: string) {
  const markets: string[] = (
    await call({
      target: comptroller,
      abi: abi.getAllMarkets,
      chain: chain as any
    })
  ).output;
  const [{ output: symbols }, { output: underlyings }] = await Promise.all([
    multiCall({
      calls: markets.map((m: string) => ({
        target: m
      })),
      abi: "erc20:symbol",
      chain: chain as any
    }),
    multiCall({
      calls: markets.map((m: string) => ({
        target: m
      })),
      abi: abi.underlying,
      chain: chain as any
    })
  ]);
  let cTokenData = markets.map((m: string, i: number) => ({
    symbol: symbols[i].output,
    underlying:
      underlyings[i].output != null
        ? underlyings[i].output.toLowerCase()
        : wrappedGasTokens[chain],
    address: m.toLowerCase()
  }));

  return cTokenData;
}

export default async function getTokenPrices(
  chain: string,
  comptroller: string
) {
  const cTokens: cToken[] = await getcTokens(chain, comptroller);

  const coinsData: read[] = await getTokenAndRedirectData(
    cTokens.map((c: cToken) => c.underlying),
    chain
  );

  const [
    tokenInfo,
    { output: underlyingDecimals },
    { output: exchangeRates }
  ] = await Promise.all([
    getTokenInfo(
      chain,
      cTokens.map((c: cToken) => c.address)
    ),
    multiCall({
      calls: cTokens.map((c: cToken) => ({
        target: c.underlying
      })),
      abi: "erc20:decimals",
      chain: chain as any
    }),
    multiCall({
      calls: cTokens.map((c: cToken) => ({
        target: c.address
      })),
      abi: abi.exchangeRateStored,
      chain: chain as any
    })
  ]);

  const unknownTokens = [];
  const prices: price[] = [];

  cTokens.map((t: cToken, i: number) => {
    try {
      const coinData: read = coinsData.filter((c: read) =>
        c.dbEntry.PK.includes(t.underlying)
      )[0];
      let price: number =
        coinData.redirect.length != 0
          ? coinData.redirect[0].price
          : coinData.dbEntry.price;

      prices.push({
        address: t.address,
        price: price * exchangeRates[i].output
      });
    } catch {
      unknownTokens.push(t.underlying);
    }
  });

  let writes: write[] = [];

  prices.map((p: price) => {
    const i = tokenInfo.decimals
      .map((d: result) => d.input.target)
      .indexOf(p.address);
    addToDBWritesList(
      writes,
      chain,
      cTokens[i].address,
      p.price / 10 ** (10 + Number(underlyingDecimals[i].output)),
      tokenInfo.decimals[i].output,
      tokenInfo.symbols[i].output
    );
  });

  return writes;
}
