/**
 * Generates token cache file served at /config/smol/token.json
 * Ported from: https://github.com/DefiLlama/defillama-app/blob/main/scripts/generateTokenJson.js
 */

import { readRouteData, storeRouteData } from "../cache/file-cache";
import { runWithRuntimeLogging } from "../utils";

const SOURCE_URL = "https://ask.llama.fi/coins";
const PROTOCOLS_URL = "/config/smol/appMetadata-protocols.json";
const CHAINS_URL = "/config/smol/appMetadata-chains.json";
const OUTPUT_ROUTE = "config/smol/token.json";

const slug = (value = "") =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/ /g, "-")
    .replace(/'/g, "");

const getCoingeckoId = (tokenNk: string | undefined) => {
  if (typeof tokenNk !== "string") return null;
  if (!tokenNk.startsWith("coingecko:")) return null;
  const geckoId = tokenNk.slice("coingecko:".length).trim().toLowerCase();
  return geckoId || null;
};

const getTokenLogo = (tokenNk: string | undefined) => {
  const geckoId = getCoingeckoId(tokenNk);
  if (!geckoId) return null;
  return `https://icons.llamao.fi/icons/tokens/gecko/${geckoId}?w=48&h=48`;
};

const shouldPreferProtocolId = (currentProtocolId: string | undefined, nextProtocolId: string) => {
  if (!currentProtocolId) return true;
  if (!nextProtocolId) return false;
  const currentIsParent = currentProtocolId.startsWith("parent#");
  const nextIsParent = nextProtocolId.startsWith("parent#");
  if (nextIsParent && !currentIsParent) return true;
  return false;
};

const getTokenMetadataExtrasByGeckoId = (protocolsMetadata: Record<string, any>, chainsMetadata: Record<string, any>) => {
  const extrasByGeckoId = new Map<string, any>();

  for (const [protocolId, item] of Object.entries(protocolsMetadata ?? {})) {
    if (typeof item?.gecko_id !== "string" || !item.gecko_id.trim()) continue;
    const geckoId = item.gecko_id.trim().toLowerCase();
    const previous = extrasByGeckoId.get(geckoId) ?? {};
    extrasByGeckoId.set(geckoId, {
      ...previous,
      ...(shouldPreferProtocolId(previous.protocolId, protocolId) ? { protocolId } : {}),
      ...(item?.tokenRights ? { tokenRights: true } : {}),
    });
  }

  for (const item of Object.values(chainsMetadata ?? {})) {
    if (typeof item?.gecko_id !== "string" || !item.gecko_id.trim()) continue;
    const geckoId = item.gecko_id.trim().toLowerCase();
    const previous = extrasByGeckoId.get(geckoId) ?? {};
    extrasByGeckoId.set(geckoId, {
      ...previous,
      ...(previous.chainId || typeof item?.id !== "string" || !item.id ? {} : { chainId: item.id }),
      ...(item?.tokenRights ? { tokenRights: true } : {}),
    });
  }

  return extrasByGeckoId;
};

const inferRouteSource = (key: string, item: any) => {
  if (key === slug(item?.symbol)) return "symbol";
  return "name";
};

const loadPreviousTokens = async (): Promise<[string, any][]> => {
  const previousData = await readRouteData(OUTPUT_ROUTE, { skipErrorLog: true });
  if (!previousData || typeof previousData !== "object") return [];
  const previousEntries: [string, any][] = [];
  for (const [key, item] of Object.entries(previousData) as [string, any][]) {
    if (typeof item?.token_nk !== "string" || item.token_nk.length === 0) continue;
    previousEntries.push([key, item]);
  }
  return previousEntries;
};

const fetchJson = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const getUniqueKey = (item: any, index: number, existingKeys: Set<string>) => {
  const symbolSlug = slug(item.symbol);
  const nameSlug = slug(item.name);
  const fallbackId = slug(item.token_nk) || `token-${index + 1}`;

  if (symbolSlug && !existingKeys.has(symbolSlug)) return symbolSlug;
  if (nameSlug && !existingKeys.has(nameSlug)) return nameSlug;

  let uniqueKey = `${nameSlug || symbolSlug || "token"}-${fallbackId}`;
  let suffix = 2;
  while (existingKeys.has(uniqueKey)) {
    uniqueKey = `${nameSlug || symbolSlug || "token"}-${fallbackId}-${suffix}`;
    suffix++;
  }
  return uniqueKey;
};

const createTokenRecord = (item: any, routeSource: string, extras: any = {}) => ({
  name: item.name,
  symbol: item.symbol,
  token_nk: item.token_nk,
  route: `/token/${encodeURIComponent(routeSource === "symbol" ? item.symbol : item.name)}`,
  is_yields: Boolean(item.on_yields),
  mcap_rank: item.mcap_rank,
  logo: getTokenLogo(item.token_nk),
  ...extras,
});

async function generateToken() {
  const [coins, protocolsMetadata, chainsMetadata] = await Promise.all([
    fetchJson(SOURCE_URL),
    readRouteData(PROTOCOLS_URL),
    readRouteData(CHAINS_URL),
  ]);

  if (!Array.isArray(coins)) {
    throw new Error(`Expected an array from ${SOURCE_URL}`);
  }

  const extrasByGeckoId = getTokenMetadataExtrasByGeckoId(protocolsMetadata, chainsMetadata);
  const previousTokens = await loadPreviousTokens();
  const uniqueCoins: any[] = [];
  const seenTokenNks = new Set<string>();

  let skippedDuplicateTokenNkCount = 0;

  for (const item of coins) {
    if (seenTokenNks.has(item.token_nk)) {
      skippedDuplicateTokenNkCount++;
      continue;
    }
    seenTokenNks.add(item.token_nk);
    uniqueCoins.push(item);
  }

  const nextTokensByTokenNk = new Map<string, { item: any; extras: any }>();
  let includedWithoutMetadataCount = 0;
  for (const item of uniqueCoins) {
    const extras = extrasByGeckoId.get(getCoingeckoId(item.token_nk)!) ?? {};
    if (Object.keys(extras).length === 0) {
      includedWithoutMetadataCount++;
    }
    nextTokensByTokenNk.set(item.token_nk, { item, extras });
  }

  const bySlug: Record<string, any> = {};
  const seenKeys = new Set<string>();
  const consumedTokenNks = new Set<string>();
  let nameFallbackCount = 0;
  let preservedMissingTokenCount = 0;

  for (const [key, previousItem] of previousTokens) {
    const tokenNk = previousItem.token_nk;
    const nextToken = nextTokensByTokenNk.get(tokenNk);
    seenKeys.add(key);

    if (!nextToken) {
      bySlug[key] = previousItem;
      preservedMissingTokenCount++;
      continue;
    }

    const routeSource = inferRouteSource(key, previousItem);
    bySlug[key] = createTokenRecord(nextToken.item, routeSource, nextToken.extras);
    consumedTokenNks.add(tokenNk);
  }

  for (const [index, item] of uniqueCoins.entries()) {
    if (consumedTokenNks.has(item.token_nk)) continue;

    const symbolSlug = slug(item.symbol);
    const key = getUniqueKey(item, index, seenKeys);
    const routeSource = inferRouteSource(key, item);
    const extras = nextTokensByTokenNk.get(item.token_nk)?.extras ?? {};

    if (key !== symbolSlug) nameFallbackCount++;

    bySlug[key] = createTokenRecord(item, routeSource, extras);
    seenKeys.add(key);
  }


  // we find duplicate symbols and remove the one that matches blacklist patterns in the key, this is to skip bridged/old versions of tokens that have same symbol as the original token
  const symbolMap: Record<string, any> = {};
  for (const [key, item] of Object.entries(bySlug)) {
    const symbol = item.symbol.toLowerCase();
    if (!symbolMap[symbol]) {
      symbolMap[symbol] = key
    } else {
      if (/old|bridged|wormhole|\(|\[/i.test(key)) {
        // console.log(`Skipping duplicate ${symbol} <- ${key}`);
        delete bySlug[key];
      }
    }
  }

  await storeRouteData(OUTPUT_ROUTE, bySlug);

  console.log(`Wrote ${Object.keys(bySlug).length} tokens to ${OUTPUT_ROUTE}. Used fallback key selection for ${nameFallbackCount} tokens, Included ${includedWithoutMetadataCount} tokens without protocol/chain metadata, Skipped ${skippedDuplicateTokenNkCount} duplicate token_nk rows, Preserved ${preservedMissingTokenCount} existing tokens missing from the current feed`);
}


export async function genTokenConfig() {
  setTimeout(() => {
    console.log("Running for more than 5 minutes, exiting.");
    process.exit(1);
  }, 5 * 60 * 1000);

  await runWithRuntimeLogging(generateToken, {
    application: "cron-task",
    type: "generate-token",
  })
    .catch(console.error)
    .then(() => process.exit(0));

}
