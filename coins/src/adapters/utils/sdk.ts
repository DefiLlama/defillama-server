import { result, multiCallResults } from "./sdkInterfaces";
import { multiCall } from "@defillama/sdk/build/abi/index";

export async function requery(
  resultsRaw: multiCallResults,
  chain: string,
  abi: string | any
) {
  const results = resultsRaw.output;
  if (results.some((r: result) => !r.success)) {
    const failed = results
      .map((r: result, i) => [r, i])
      .filter((r: any) => !r[0].success);
    const newResults = await multiCall({
      abi,
      chain: chain as any,
      calls: failed.map((f: any) => f[0].input)
    }).then(({ output }) => output);
    failed.forEach((f: any, i) => {
      results[f[1]] = newResults[i];
    });
  }
}
