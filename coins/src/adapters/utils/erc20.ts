import { multiCall } from "@defillama/sdk/build/abi/index";
import { requery } from "./sdk";
export async function getTokenInfo(
  chain: string,
  targets: string[],
  block: number | undefined,
  requery: boolean = true
) {
  const [supplies, decimals, symbols] = await Promise.all([
    multiCall({
      calls: targets.map((target: string) => ({
        target
      })),
      chain: chain as any,
      abi: "erc20:totalSupply",
      requery,
      block
    }),
    multiCall({
      calls: targets.map((target: string) => ({
        target
      })),
      chain: chain as any,
      abi: "erc20:decimals",
      requery,
      block
    }),
    multiCall({
      calls: targets.map((target: string) => ({
        target
      })),
      abi: "erc20:symbol",
      chain: chain as any,
      requery,
      block
    })
  ]);

  return {
    supplies: supplies.output,
    decimals: decimals.output,
    symbols: symbols.output
  };
}
interface Lp {
  address: string;
  primaryUnderlying: string;
  secondaryUnderlying: string;
}
export async function getLPInfo(
  chain: string,
  targets: Lp[],
  block: number | undefined
) {
  const [
    supplies,
    lpDecimals,
    lpSymbol,
    underlyingDecimalAs,
    underlyingDecimalBs,
    symbolAs,
    symbolBs
  ] = await Promise.all([
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.address
      })),
      chain: chain as any,
      abi: "erc20:totalSupply",
      requery: true,
      block
    }),
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.address
      })),
      chain: chain as any,
      abi: "erc20:decimals",
      requery: true,
      block
    }),
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.address
      })),
      abi: "erc20:symbol",
      chain: chain as any,
      requery: true,
      block
    }),
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.primaryUnderlying
      })),
      chain: chain as any,
      abi: "erc20:decimals",
      requery: true,
      block
    }),
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.secondaryUnderlying
      })),
      chain: chain as any,
      abi: "erc20:decimals",
      requery: true,
      block
    }),
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.primaryUnderlying
      })),
      abi: "erc20:symbol",
      chain: chain as any,
      block
    }),
    multiCall({
      calls: targets.map((target: Lp) => ({
        target: target.secondaryUnderlying
      })),
      abi: "erc20:symbol",
      chain: chain as any,
      block
    })
  ]);
  await requery(symbolBs, chain, "erc20:symbol", block);
  await requery(symbolAs, chain, "erc20:symbol", block);
  return {
    supplies: supplies.output,
    lpDecimals: lpDecimals.output,
    underlyingDecimalAs: underlyingDecimalAs.output,
    underlyingDecimalBs: underlyingDecimalBs.output,
    symbolAs: symbolAs.output,
    symbolBs: symbolBs.output,
    lpSymbol: lpSymbol.output
  };
}
export async function listUnknownTokens(
  chain: string,
  unknownTokens: string[],
  block: number | undefined
) {
  unknownTokens = unknownTokens.reduce(function (a: string[], b) {
    if (a.indexOf(b) == -1) a.push(b);
    return a;
  }, []);
  const unknownSymbols = (
    await multiCall({
      calls: unknownTokens.map((t) => ({
        target: t
      })),
      abi: "erc20:symbol",
      chain: chain as any,
      block
    })
  ).output.map((o) => o.output);
  unknownTokens = unknownTokens.map((t, i) => `${unknownSymbols[i]}-${t}`);
  console.log(chain);
  console.log(unknownTokens);
}
