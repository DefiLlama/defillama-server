import { Result, MultiCallResults } from "./sdkInterfaces";
import { multiCall } from "@defillama/sdk/build/abi/index";

export async function requery(
  resultsRaw: MultiCallResults,
  chain: string,
  abi: string | any,
  block: number | undefined = undefined
) {
  const results = resultsRaw.output;
  if (results.some((r: Result) => !r.success)) {
    const failed = results
      .map((r: Result, i) => [r, i])
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
