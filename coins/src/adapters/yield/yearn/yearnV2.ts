import { multiCall, call } from "@defillama/sdk/build/abi/index";
import { getLatestBlock } from "@defillama/sdk/build/util/index";
import abi from "./abi.json";
import { request, gql } from "graphql-request";
import { batchGet } from "../../../utils/shared/dynamodb";
import { PromisePool } from "@supercharge/promise-pool";
import axios from "axios";

const chains: object = {
  ethereum: 1,
  arbitrum: 42161,
  fantom: 250
};
interface tokenKeys {
  symbol: string;
  address: string;
}
interface vaultKeys {
  symbol: string;
  token: tokenKeys;
  address: string;
  type: string;
}
interface multiCallResults {
  output: result[];
}
interface result {
  success: boolean;
  input: object;
}

async function requery(
  resultsRaw: multiCallResults,
  chain: string,
  block: number | undefined,
  abi: object
) {
  const results = resultsRaw.output;
  if (results.some((r: result) => !r.success)) {
    const failed = results
      .map((r: result, i) => [r, i])
      .filter((r: any) => !r[0].success);
    const newResults = await multiCall({
      abi,
      chain: chain as any,
      calls: failed.map((f: any) => f[0].input),
      block
    }).then(({ output }) => output);
    failed.forEach((f: any, i) => {
      results[f[1]] = newResults[i];
    });
  }
}

export async function getTokenPrices(chain: string) {
  let vaults = (
    await axios.get(
      `https://api.yearn.finance/v1/chains/${
        chains[chain as keyof object]
      }/vaults/all`
    )
  ).data;
  // .map((v: vaultKeys) => ({
  //   vaultSymbol: v.symbol,
  //   underlyingSymbol: v.token.symbol,
  //   vaultAddress: v.address,
  //   underlyingAddress: v.token.address,
  //   type: v.type
  // }));

  let addresses = vaults.reduce(
    (a: string, b: vaultKeys) => `${a},${b.token.address}`,
    ""
  );
  let tokenPrices = (
    await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/${chain}?contract_addresses=${addresses}&vs_currencies=usd`
    )
  ).data;

  let b = await multiCall({
    abi: abi.pricePerShare,
    calls: vaults.map((v: vaultKeys) => ({
      target: v.address
    })),
    chain: chain as any
  });
  await requery(b, chain, undefined, abi.getPricePerFullShare);
  await requery(b, chain, undefined, abi.constantPricePerShare);
  b.output = b.output.filter((v) => v.success == true);

  const usdValues = b.output.map((t) => {
    const selectedVaults = vaults.filter(
      (v: vaultKeys) => v.address.toLowerCase() == t.input.target.toLowerCase()
    );
    const underlying = selectedVaults[0].token.address;
    const underlyingPrice = tokenPrices[underlying.toLowerCase()];
    if (!underlyingPrice) {
      return;
    }
    const decimals = resolveDecimals(t.output, 0);

    return {
      address: `asset#${chain}:${t.input.target.toLowerCase()}`,
      price: (t.output * underlyingPrice.usd) / 10 ** decimals,
      decimals: decimals
    };
  });

  const underlyingPrices = await batchGet(
    vaults.map((v: vaultKeys) => ({
      PK: `asset#${chain}:${v.token.address}`,
      SK: 0
    }))
  );
}

function resolveDecimals(value: number, i: number) {
  if (value > 10) i = resolveDecimals(value / 10, i) + 1;
  return i;
}

async function main() {
  await getTokenPrices("ethereum");
  console.log("a");
}
main();
