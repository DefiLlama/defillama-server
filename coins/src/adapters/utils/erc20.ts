import { call, multiCall } from "@defillama/sdk/build/abi/index";
export async function getTokenInfo(chain: string, targets: string[]) {
  const [
    { output: supplies },
    { output: decimals },
    { output: symbols }
  ] = await Promise.all([
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
  return {
    supplies,
    decimals,
    symbols
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
  console.log(unknownTokens);
}
