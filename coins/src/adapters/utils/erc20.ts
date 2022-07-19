import { call, multiCall } from "@defillama/sdk/build/abi/index";
import { requery } from "./sdk";
export async function getTokenInfo(chain: string, targets: string[]) {
  const [supplies, decimals, symbols] = await Promise.all([
    multiCall({
      calls: targets.map((target: string) => ({
        target
      })),
      chain: chain as any,
      abi: "erc20:totalSupply"
    }),
    multiCall({
      calls: targets.map((target: string) => ({
        target
      })),
      chain: chain as any,
      abi: "erc20:decimals"
    }),
    multiCall({
      calls: targets.map((target: string) => ({
        target
      })),
      abi: "erc20:symbol",
      chain: chain as any
    })
  ]);

  await Promise.all([
    requery(supplies, chain, "erc20:totalSupply"),
    requery(decimals, chain, "erc20:decimals"),
    requery(symbols, chain, "erc20:symbol")
  ]);

  return {
    supplies: supplies.output,
    decimals: decimals.output,
    symbols: symbols.output
  };
}
interface lp {
  address: string;
  primaryUnderlying: string;
  secondaryUnderlying: string;
}
export async function getLPInfo(chain: string, targets: lp[]) {
  const [
    supplies,
    lpDecimals,
    underlyingDecimals,
    symbolAs,
    symbolBs,
    lpSymbol
  ] = await Promise.all([
    multiCall({
      calls: targets.map((target: lp) => ({
        target: target.address
      })),
      chain: chain as any,
      abi: "erc20:totalSupply"
    }),
    multiCall({
      calls: targets.map((target: lp) => ({
        target: target.address
      })),
      chain: chain as any,
      abi: "erc20:decimals"
    }),
    multiCall({
      calls: targets.map((target: lp) => ({
        target: target.primaryUnderlying
      })),
      chain: chain as any,
      abi: "erc20:decimals"
    }),
    multiCall({
      calls: targets.map((target: lp) => ({
        target: target.secondaryUnderlying
      })),
      abi: "erc20:symbol",
      chain: chain as any
    }),
    multiCall({
      calls: targets.map((target: lp) => ({
        target: target.primaryUnderlying
      })),
      abi: "erc20:symbol",
      chain: chain as any
    }),
    multiCall({
      calls: targets.map((target: lp) => ({
        target: target.address
      })),
      abi: "erc20:symbol",
      chain: chain as any
    })
  ]);

  await Promise.all([
    requery(supplies, chain, "erc20:totalSupply"),
    requery(lpDecimals, chain, "erc20:decimals"),
    requery(underlyingDecimals, chain, "erc20:decimals"),
    requery(symbolAs, chain, "erc20:symbol"),
    requery(symbolBs, chain, "erc20:symbol"),
    requery(lpSymbol, chain, "erc20:symbol")
  ]);

  return {
    supplies: supplies.output,
    lpDecimals: lpDecimals.output,
    underlyingDecimals: underlyingDecimals.output,
    symbolAs: symbolAs.output,
    symbolBs: symbolBs.output,
    lpSymbol: lpSymbol.output
  };
}
export async function listUnknownTokens(
  chain: string,
  unknownTokens: string[]
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
      chain: chain as any
    })
  ).output.map((o) => o.output);
  unknownTokens = unknownTokens.map((t, i) => `${unknownSymbols[i]}-${t}`);
  console.log(chain);
  console.log(unknownTokens);
}
