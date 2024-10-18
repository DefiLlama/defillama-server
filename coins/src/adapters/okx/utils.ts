import fetch, { BodyInit, HeadersInit, Response } from "node-fetch";
import { secrets } from "./secrets";
import { HmacSHA256, enc } from "crypto-js";
import { multiCall } from "@defillama/sdk/build/abi/abi2";
import {
  Endpoint,
  Method,
  OkxResponse,
  OkxTokenQuery,
  OkxTokenResponse,
} from "./types";
import {
  burl,
  chainGasTokens,
  chainIdMap,
  endpoints,
  gasAddress,
} from "./constants";

export async function logMissingTokens() {
  // WIP
  return;
}
export function buildHeaders(
  method: Method,
  path: string,
  bodyString: string,
): HeadersInit {
  const now: Date = new Date();
  const iso: string = now.toISOString();
  const sign: string = enc.Base64.stringify(
    HmacSHA256(`${iso}${method}${path}${bodyString}`, secrets.secret),
  );

  return {
    "OK-ACCESS-KEY": secrets.key,
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": iso,
    "OK-ACCESS-PASSPHRASE": secrets.pass,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export function buildRequestParams(query?: { [key: string]: string }): string {
  let queryString: string = "?";
  if (!query || !Object.keys(query)) return "";
  Object.keys(query).map((key, i) => {
    if (i != 0) queryString += `&`;
    queryString += `${key}=${query[key]}`;
  });
  return queryString;
}

export async function fetchWithAuth(
  key: string,
  query: {
    body?: any;
    params?: { [key: string]: string };
  },
): Promise<OkxResponse> {
  const endpoint: Endpoint = endpoints[key];
  if (!endpoint) throw new Error("unrecognised endpoint key");
  const { method, path } = endpoint;

  const params: string = buildRequestParams(query.params);
  const headers: HeadersInit = buildHeaders(
    method,
    `${path}${params}`,
    JSON.stringify(query.body),
  );
  const body: BodyInit | undefined = query.body
    ? JSON.stringify(query.body)
    : undefined;

  const res: Response = await fetch(`${burl}${path}${params}`, {
    method,
    headers,
    body,
  });

  return await res.json();
}

export function convertQueriesToOkxForm(tokens: string[]): {
  queries: OkxTokenQuery[];
  queryMap: { [queryKey: string]: string };
} {
  const queries: OkxTokenQuery[] = [];
  const queryMap: { [queryKey: string]: string } = {};

  tokens.map((t: string) => {
    const [chain, address] = t.split(":");
    if (!(chain in chainIdMap)) return;
    // could deal with FBRC, BRC, Runes, SRC here
    const chainIndex = `${chainIdMap[chain]}`;
    const tokenAddress = address == gasAddress ? "" : address;
    queries.push({ chainIndex, tokenAddress });
    queryMap[`${chainIndex}:${tokenAddress}`] = t;
  });

  return { queries, queryMap };
}

export async function fetchDecimalsAndSymbols(tokensWithOkxData: {
  [token: string]: OkxTokenResponse;
}): Promise<{ [chain: string]: { [token: string]: any } }> {
  // create a results object for decimals and symbol results to fall into
  let metadataResults: { [chain: string]: { [token: string]: any } } = {};
  Object.keys(tokensWithOkxData).map((t) => {
    const [chain, address] = t.split(":");
    if (!(chain in metadataResults)) metadataResults[chain] = {};
    if (address != gasAddress)
      metadataResults[chain][address] = {
        decimals: undefined,
        symbol: undefined,
      };
    else if (chain in chainGasTokens)
      metadataResults[chain][address] = {
        decimals: chainGasTokens[chain].decimals,
        symbol: chainGasTokens[chain].symbol,
      };
  });

  const calls: { [chain: string]: any[] } = {};
  Object.keys(metadataResults).map((chain) => {
    calls[chain] = Object.keys(metadataResults[chain])
      .map((target) => ({
        target,
      }))
      .filter((c) => c.target != gasAddress);
  });

  // multicall across chains for decimal and symbol data
  await Promise.all([
    ...Object.keys(metadataResults).map((chain) =>
      multiCall({
        chain,
        abi: "erc20:decimals",
        calls: calls[chain],
        permitFailure: true,
        withMetadata: true,
      }).then((rs) => {
        rs.map((r) => {
          metadataResults[chain][r.input.target].decimals = r.output;
        });
      }),
    ),
    ...Object.keys(metadataResults).map((chain) =>
      multiCall({
        chain,
        abi: "erc20:symbol",
        calls: calls[chain],
        permitFailure: true,
        withMetadata: true,
      }).then((rs) => {
        rs.map((r) => {
          metadataResults[chain][r.input.target].symbol = r.output;
        });
      }),
    ),
  ]);

  return metadataResults;
}
