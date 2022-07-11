import { multiCall } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import { batchGet, batchWrite } from "../../../utils/shared/dynamodb";
import axios from "axios";
const chains: object = {
  ethereum: 1,
  arbitrum: 42161,
  fantom: 250
};
const manualVaults = [
  "0x04bC0Ab673d88aE9dbC9DA2380cB6B79C4BCa9aE", // yBUSD
  "0xE6354ed5bC4b393a5Aad09f21c46E101e692d447", // yUSDT
  "0x26EA744E5B887E5205727f55dFBE8685e3b21951", // yUSDC
  "0xC2cB1040220768554cf699b0d863A3cd4324ce32", // yDAI
  "0x99d1fa417f94dcd62bfe781a1213c092a47041bc", // ycDAI
  "0x9777d7e2b60bb01759d0e2f8be2095df444cb07e", // ycUSDC
  "0x1be5d71f2da660bfdee8012ddc58d024448a0a59", // ycUSDT
  "0x16de59092dae5ccf4a1e6439d611fd0653f0bd01", // yDAI
  "0xd6ad7a6750a7593e092a9b218d66c0a814a3436e", // yUSDC
  "0x83f798e925bcd4017eb265844fddabb448f1707d", // yUSDT
  "0x73a052500105205d34daf004eab301916da8190f" // yTUSD
];

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
  redirectResults: any[]
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
      address: t.input.target.toLowerCase(),
      price: (t.output * underlyingPrice) / 10 ** decimals,
      decimals: decimals,
      symbol: selectedVaults[0].symbol
    };
  });

  return usdValues.filter((v) => Object.keys(v).length !== 0);
}
async function pushMoreVaults(chain: string, vaults: any) {
  const [{ output: tokens }, { output: symbols }] = await Promise.all([
    multiCall({
      abi: abi.token,
      chain: chain as any,
      calls: manualVaults.map((v) => ({
        target: v
      }))
    }),
    multiCall({
      abi: "erc20:symbol",
      chain: chain as any,
      calls: manualVaults.map((v) => ({
        target: v
      }))
    })
  ]);

  const vaultInfo = manualVaults.map((v, i) => ({
    address: v,
    token: {
      address: tokens[i].output
    },
    symbol: symbols[i].output
  }));
  vaults.push(...vaultInfo);
}
export async function getTokenPrices(chain: string) {
  let vaults = (
    await axios.get(
      `https://api.yearn.finance/v1/chains/${
        chains[chain as keyof object]
      }/vaults/all`
    )
  ).data;
  // 135
  await pushMoreVaults(chain, vaults);

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
    redirectResults
  );

  await Promise.all([
    batchWrite(
      usdValues.map((v) => ({
        SK: Date.now(),
        PK: `asset#${chain}:${v.address}`,
        price: v.price,
        symbol: v.symbol,
        decimals: v.decimals
      })),
      true
    ),
    batchWrite(
      usdValues.map((v) => ({
        SK: 0,
        PK: `asset#${chain}:${v.address}`,
        price: v.price,
        symbol: v.symbol,
        decimals: v.decimals
      })),
      true
    )
  ]);
}
