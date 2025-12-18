import { cache } from "../cache";
import { sluggifyString } from "../../utils/sluggify";
import { readRouteData } from "../cache/file-cache";

export type EntityType = "protocol" | "chain";

export interface ResolvedEntity {
  name: string;
  slug: string;
  type: EntityType;
  id?: string;
  geckoId?: string | null;
  originalInput: string;
}

export async function resolveEntity(
  input: string,
  chainsMap: Map<string, any>,
  protocolsMap: Map<string, any>
): Promise<ResolvedEntity | null> {
  const inputSlug = sluggifyString(input);

  const chain = chainsMap.get(inputSlug);
  if (chain) {
    const chainGeckoInfo = cache.metadata?.chainCoingeckoIds?.[chain.name];
    return {
      name: chain.name,
      slug: sluggifyString(chain.name),
      type: "chain",
      geckoId: chainGeckoInfo?.geckoId ?? chain.gecko_id ?? null,
      originalInput: input,
    };
  }

  const matchedProtocol = protocolsMap.get(inputSlug);
  if (matchedProtocol) {
    return {
      name: matchedProtocol.name,
      slug: sluggifyString(matchedProtocol.name),
      type: "protocol",
      id: matchedProtocol.id,
      geckoId: matchedProtocol.gecko_id ?? null,
      originalInput: input,
    };
  }

  return null;
}

export async function resolveEntities(inputs: string[]): Promise<Map<string, ResolvedEntity | null>> {
  const results = new Map<string, ResolvedEntity | null>();

  const chainsMap = await getChainsMap();
  const protocolsMap = getProtocolsMap();

  for (const input of inputs) {
    const slug = sluggifyString(input);
    const resolved = await resolveEntity(input, chainsMap, protocolsMap);
    results.set(slug, resolved);
  }

  return results;
}

async function getChainsMap(): Promise<Map<string, any>> {
  let chainsCache: Map<string, any> | null = null;

  const chainsData = (await readRouteData("v2/chains")) || [];
  chainsCache = new Map();

  for (const chain of chainsData) {
    const slug = sluggifyString(chain.name);
    chainsCache.set(slug, chain);

    // Also map by tokenSymbol if available
    if (chain.tokenSymbol) {
      chainsCache.set(sluggifyString(chain.tokenSymbol), chain);
    }
  }

  return chainsCache;
}

function getProtocolsMap(): Map<string, any> {
  const protocolsMap = new Map<string, any>();

  for (const [slug, protocol] of Object.entries(cache.protocolSlugMap)) {
    protocolsMap.set(slug, protocol);
  }

  const protocols = cache.metadata?.protocols || [];
  for (const protocol of protocols) {
    if (protocol.symbol && protocol.symbol !== "-") {
      protocolsMap.set(sluggifyString(protocol.symbol), protocol);
    }
  }

  for (const [slug, protocol] of Object.entries(cache.parentProtocolSlugMap)) {
    protocolsMap.set(slug, protocol);
  }

  const parentProtocols = cache.metadata?.parentProtocols || [];
  for (const protocol of parentProtocols) {
    if (protocol.symbol && protocol.symbol !== "-") {
      protocolsMap.set(sluggifyString(protocol.symbol), protocol);
    }
  }

  return protocolsMap;
}
