const abi = require("./abi.json");
import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";
const wrappedGasTokens: { [key: string]: any } = {
  ethereum: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
};

async function getcTokens(chain: string, comptroller: string) {
  const markets = (
    await call({
      target: comptroller,
      abi: abi.getAllMarkets,
      chain: chain as any
    })
  ).output;
  const [{ output: symbols }, { output: underlyings }] = await Promise.all([
    multiCall({
      calls: markets.map((m: any) => ({
        target: m
      })),
      abi: "erc20:symbol",
      chain: chain as any
    }),
    multiCall({
      calls: markets.map((m: any) => ({
        target: m
      })),
      abi: abi.underlying,
      chain: chain as any
    })
  ]);
  let cTokenData = markets.map((m: any, i: number) => ({
    symbol: symbols[i].output,
    underlying:
      underlyings[i].output != null
        ? underlyings[i].output.toLowerCase()
        : wrappedGasTokens[chain],
    address: m.toLowerCase()
  }));

  return cTokenData;
}
async function getTokenData(chain: string, cTokens: any) {
  return await Promise.all([
    multiCall({
      calls: cTokens.map((c: any) => ({
        target: c.address
      })),
      abi: "erc20:decimals",
      chain: chain as any
    }),
    multiCall({
      calls: cTokens.map((c: any) => ({
        target: c.address
      })),
      abi: "erc20:symbol",
      chain: chain as any
    }),
    multiCall({
      calls: cTokens.map((c: any) => ({
        target: c.address
      })),
      abi: abi.exchangeRateStored,
      chain: chain as any
    }),
    multiCall({
      calls: cTokens.map((c: any) => ({
        target: c.underlying
      })),
      abi: "erc20:decimals",
      chain: chain as any
    })
  ]);
}
export async function getTokenPrices(chain: string, comptroller: string) {
  const cTokens = await getcTokens(chain, comptroller);

  const underlyingPrices = await batchGet(
    cTokens.map((v: any) => ({
      PK: `asset#${chain}:${v.underlying}`,
      SK: 0
    }))
  );

  const redirects = [];
  for (let i = 0; i < underlyingPrices.length; i++) {
    if (!("redirect" in underlyingPrices[i])) continue;
    redirects.push({
      PK: underlyingPrices[i].redirect,
      SK: 0
    });
  }

  const unknownTokens = [];
  const [
    redirectResults,
    [
      { output: decimals },
      { output: symbols },
      { output: exchangeRates },
      { output: underlyingDecimals }
    ]
  ] = await Promise.all([batchGet(redirects), getTokenData(chain, cTokens)]);

  const prices: any[] = [];
  cTokens.map((t: any, i: number) => {
    try {
      let underlyingPrice = underlyingPrices.filter((p) =>
        p.PK.includes(t.underlying)
      )[0];
      let price: number;
      if (underlyingPrice && "redirect" in underlyingPrice) {
        const redirectResult = redirectResults.filter(
          (r) => underlyingPrice.redirect == r.PK
        )[0];
        price = redirectResult.price;
      } else {
        price = underlyingPrice.price;
      }

      prices.push({
        address: t.address,
        price: price * exchangeRates[i].output
      });
    } catch {
      unknownTokens.push(t.underlying);
    }
  });

  let writes: any[] = [];
  prices.map((p: any) => {
    const i = decimals.map((d: any) => d.input.target).indexOf(p.address);
    writes.push(
      {
        decimals: Number(decimals[i].output),
        PK: `asset#${chain}:${cTokens[i].address}`,
        SK: Date.now(),
        symbol: symbols[i].output,
        price: p.price / 10 ** (10 + Number(underlyingDecimals[i].output))
      },
      {
        decimals: Number(decimals[i].output),
        PK: `asset#${chain}:${cTokens[i].address}`,
        SK: 0,
        symbol: symbols[i].output,
        price: p.price / 10 ** (10 + Number(underlyingDecimals[i].output))
      }
    );
  });

  await batchWrite(writes, true);
}
