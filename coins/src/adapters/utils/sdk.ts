import { Result, MultiCallResults } from "./sdkInterfaces";
import { multiCall } from "@defillama/sdk/build/abi/index";
import * as sdk from '@defillama/sdk'

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


export async function getApi(
  chain: string,
  timestamp: number | undefined = 0
): Promise<sdk.ChainApi> {
  const api = new sdk.ChainApi({ chain })
  const timeNow = Date.now() / 1e3
  const ONE_HOUR = 60 * 60
  if (timestamp !== 0 && timestamp < (timeNow - ONE_HOUR)) { // fetch block information only if timestamp is at least one hour back
    api.timestamp = timestamp
    await api.getBlock()
  } else {
    api.timestamp = 0
  }
  return api
}
