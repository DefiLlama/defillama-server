import fetch, { BodyInit, HeadersInit, Response } from "node-fetch";
import { HmacSHA256, enc } from "crypto-js";
import { Endpoint, Method, OkxResponse, OkxTokenQuery, TokenPK } from "./types";
import { burl, chainIdMap, endpoints, gasAddress } from "./constants";

export function buildHeaders(
  method: Method,
  path: string,
  bodyString: string,
): HeadersInit {
  const now: Date = new Date();
  const iso: string = now.toISOString();
  const sign: string = enc.Base64.stringify(
    HmacSHA256(
      `${iso}${method}${path}${bodyString}`,
      process.env.OKX_SECRET ?? "",
    ),
  );

  return {
    "OK-ACCESS-KEY": process.env.OKX_KEY ?? "",
    "OK-ACCESS-SIGN": sign,
    "OK-ACCESS-TIMESTAMP": iso,
    "OK-ACCESS-PASSPHRASE": process.env.OKX_PASSPHRASE ?? "",
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

export function convertQueriesToOkxForm(tokens: TokenPK[]): {
  queries: OkxTokenQuery[];
  queryMap: { [queryKey: string]: string };
} {
  const queries: OkxTokenQuery[] = [];
  const queryMap: { [queryKey: string]: string } = {};

  tokens.map(({ chain, address }) => {
    if (!(chain in chainIdMap)) return;
    // could deal with FBRC, BRC, Runes, SRC here
    const chainIndex = `${chainIdMap[chain]}`;
    const tokenAddress = address == gasAddress ? "" : address;
    queries.push({ chainIndex, tokenAddress });
    queryMap[`${chainIndex}:${tokenAddress}`] = `${chain}:${address}`;
  });

  return { queries, queryMap };
}
