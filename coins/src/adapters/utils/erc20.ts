import { getCache, setCache } from "../../utils/cache";
import * as sdk from "@defillama/sdk";
import { Result } from "./sdkInterfaces";
import { DbTokenInfos } from "./dbInterfaces";

const project = "coins/erc20-data";
const cacheObject = {} as any;

export async function getTokenInfo(
  chain: string = "ethereum",
  targets: string[],
  block: number | undefined,
  params: {
    withSupply?: boolean;
    timestamp?: number;
  } = {},
): Promise<DbTokenInfos> {
  const { withSupply = false, timestamp } = params;
  targets = targets.map((i) => i.toLowerCase());
  if (chain === 'solana') {
    console.error('Solana not supported')
    const decimals = targets.map(() => ({ output: 0, success: true }))
    const symbols = targets.map(() => ({ output: '-', success: true }))
    return { decimals, symbols, } as any
  }

  const api = new sdk.ChainApi({ chain, block, timestamp });
  const [decimals, symbols] = await Promise.all([
    _getCachedData({ api, targets, subkey: "decimals" }),
    _getCachedData({ api, targets, subkey: "symbol" }),
  ]);

  let supplies: Result[] = [];
  if (withSupply)
    supplies = (await api.multiCall({
      abi: "erc20:totalSupply",
      calls: targets,
      withMetadata: true,
    })) as Result[];

  return {
    supplies,
    decimals,
    symbols,
  };
}

export async function getTokenInfoMap(chain: string = "ethereum", targets: string[]) {
  const res = await getTokenInfo(chain, targets, undefined);
  const map: {
    [address: string]: {
      symbol: string;
      decimals: number;
    };
  } = {};
  res.decimals.forEach((d, i) => {
    if (!res.symbols[i].success || !d.success) return;
    map[targets[i]] = {
      symbol: res.symbols[i].output,
      decimals: d.output,
    };
  });
  return map;
}

interface Lp {
  address: string;
  primaryUnderlying: string;
  secondaryUnderlying: string;
}

export async function getLPInfo(
  chain: string,
  targets: Lp[],
  block: number | undefined,
) {
  const api = new sdk.ChainApi({ chain, block });

  const supplies = await api.multiCall({
    abi: "erc20:totalSupply",
    calls: targets.map((i: any) => i.address),
    withMetadata: true,
    permitFailure: true,
  });

  const [
    lpDecimals,
    lpSymbols,
    underlyingDecimalAs,
    underlyingDecimalBs,
    symbolAs,
    symbolBs,
  ] = await Promise.all([
    _getCachedData({
      api,
      targets: targets.map((i: any) => i.address),
      subkey: "decimals",
    }),
    _getCachedData({
      api,
      targets: targets.map((i: any) => i.address),
      subkey: "symbol",
    }),
    _getCachedData({
      api,
      targets: targets.map((i: any) => i.primaryUnderlying),
      subkey: "decimals",
    }),
    _getCachedData({
      api,
      targets: targets.map((i: any) => i.secondaryUnderlying),
      subkey: "decimals",
    }),
    _getCachedData({
      api,
      targets: targets.map((i: any) => i.primaryUnderlying),
      subkey: "symbol",
    }),
    _getCachedData({
      api,
      targets: targets.map((i: any) => i.secondaryUnderlying),
      subkey: "symbol",
    }),
  ]);

  return {
    supplies,
    lpDecimals,
    lpSymbols,
    underlyingDecimalAs,
    underlyingDecimalBs,
    symbolAs,
    symbolBs,
  };
}

export async function listUnknownTokens(
  chain: string,
  unknownTokens: string[],
  block: number | undefined,
) {
  unknownTokens = unknownTokens.reduce(function (a: string[], b) {
    if (a.indexOf(b) == -1) a.push(b);
    return a;
  }, []);
  const api = new sdk.ChainApi({ chain, block });
  const unknownSymbols = await _getCachedData({
    api,
    targets: unknownTokens,
    subkey: "symbol",
  });
  unknownTokens = unknownTokens.map(
    (t, i) => `${unknownSymbols[i].output}-${t}`,
  );
  console.log(chain);
  console.log(unknownTokens);
}

async function _getCachedData(params: {
  api: sdk.ChainApi;
  targets: string[];
  subkey: string;
  abi?: string;
}): Promise<Result[]> {
  let { api, targets, subkey, abi } = params;
  if (!abi) abi = "erc20:" + subkey;
  api.block = undefined;
  if (!targets.length) return [];
  const key = `${project}/${subkey}`;
  const chain = api.chain as string;
  const cacheKey = `${key}/${chain}`;

  if (!cacheObject[cacheKey])
    cacheObject[cacheKey] = await getCache(key, chain);

  const cache = cacheObject[cacheKey];
  targets = targets.map((i) => i.toLowerCase());
  const missing = targets.filter((i) => !cache[i]);
  const decimals = await api.multiCall({
    abi,
    calls: missing,
    permitFailure: true,
  });
  decimals.forEach((o, i) => (cache[missing[i]] = o));
  await setCache(key, chain, cache);

  return targets.map((i) => {
    return {
      input: { target: i },
      output: cache[i],
      success: !!cache[i],
    };
  }) as Result[];
}
