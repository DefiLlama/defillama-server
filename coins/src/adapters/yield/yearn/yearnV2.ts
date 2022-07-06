import { multiCall } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";
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
  input: {
    target: string;
  };
  output: any;
}
function resolveDecimals(value: number, i: number) {
  if (value > 10) i = resolveDecimals(value / 10, i) + 1;
  return i;
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
async function getPricePerShare(vaults: any[], chain: string) {
  let pricePerShares = await multiCall({
    abi: abi.pricePerShare,
    calls: vaults.map((v: vaultKeys) => ({
      target: v.address
    })),
    chain: chain as any
  });
  await requery(pricePerShares, chain, undefined, abi.getPricePerFullShare);
  await requery(pricePerShares, chain, undefined, abi.constantPricePerShare);
  pricePerShares.output = pricePerShares.output.filter(
    (v) => v.success == true
  );
  return pricePerShares;
}
async function getUsdValues(
  pricePerShares: multiCallResults,
  vaults: any[],
  underlyingPrices: any[],
  redirectResults: any[],
  chain: string
) {
  let usdValues = pricePerShares.output.map((t) => {
    const selectedVaults = vaults.filter(
      (v: vaultKeys) => v.address.toLowerCase() == t.input.target.toLowerCase()
    );
    const underlying = selectedVaults[0].token.address;
    const redirectKeys = underlyingPrices.filter((p) =>
      p.PK.includes(underlying.toLowerCase())
    );
    if (redirectKeys.length == 0) {
      return {};
    }
    const underlyingPrice = redirectResults.filter(
      (p) => p.PK == redirectKeys[0].redirect
    )[0].price;

    const decimals = resolveDecimals(t.output, 0);

    return {
      address: `asset#${chain}:${t.input.target.toLowerCase()}`,
      price: (t.output * underlyingPrice) / 10 ** decimals,
      decimals: decimals
    };
  });

  return usdValues.filter((v) => Object.keys(v).length !== 0);
}
export async function getTokenPrices(chain: string) {
  let vaults = (
    await axios.get(
      `https://api.yearn.finance/v1/chains/${
        chains[chain as keyof object]
      }/vaults/all`
    )
  ).data;

  const underlyingPrices = await batchGet(
    vaults.map((v: vaultKeys) => ({
      PK: `asset#${chain}:${v.token.address.toLowerCase()}`,
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

  const [redirectResults, pricePerShares] = await Promise.all([
    batchGet(redirects),
    getPricePerShare(vaults, chain)
  ]);

  const usdValues = await getUsdValues(
    pricePerShares,
    vaults,
    underlyingPrices,
    redirectResults,
    chain
  );

  //.map((v) => v || {});
  // const sendThis: PutItemInputAttributeMap[] = usdValues.map((v) => ({
  //   "prod-coins-table": v
  // }));
  // let queryString: AttributeValue = `{"prod-coins-table": [{"PutRequest": {"Item": {`;
  // for (let i = 0; i < usdValues.length; i++) {
  //   queryString = queryString.concat(usdValues[i] || "");
  //   queryString.concat(`}}}]}`);
  // }

  await batchWrite(
    usdValues.map((v) => ({
      SK: Date.now(),
      PK: v.address,
      price: v.price
    })),
    true
  );
}

async function main() {
  await getTokenPrices("ethereum");
  console.log("a");
}
main();
