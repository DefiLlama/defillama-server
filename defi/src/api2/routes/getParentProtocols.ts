import parentProtocolsList from "../../protocols/parentProtocols";
import type { IParentProtocol } from "../../protocols/types";
import type { LiteProtocol } from "../../types";

interface ChildProtocol {
  id: string;
  name: string;
  symbol: string | null;
  tvl: number | null;
  chains: string[];
  excludedFromParentTvl?: boolean;
}

export interface ParentProtocolEntry extends IParentProtocol {
  tvl: number | null;
  chainTvls: { [chain: string]: number };
  mcap: number | null;
  childProtocols: ChildProtocol[];
}

interface ChildExclusionMeta {
  excludeTvlFromParent?: boolean;
  tokensExcludedFromParent?: { [chain: string]: string[] };
}

interface Protocols2DataLike {
  protocols: LiteProtocol[];
  parentProtocols: Array<IParentProtocol & { mcap?: number | null }>;
}

export function getParentProtocolsInternal(
  protocols2Data: Protocols2DataLike,
  childMetadataById: Map<string, ChildExclusionMeta> = new Map(),
): ParentProtocolEntry[] {
  const { protocols, parentProtocols } = protocols2Data;

  const childrenByParent = new Map<string, LiteProtocol[]>();
  for (const protocol of protocols) {
    const parentId = protocol.parentProtocol;
    if (!parentId) continue;
    const bucket = childrenByParent.get(parentId);
    if (bucket) bucket.push(protocol);
    else childrenByParent.set(parentId, [protocol]);
  }

  const parentMetaById = new Map(parentProtocols.map((p) => [p.id, p]));

  const result: ParentProtocolEntry[] = [];

  for (const baseParent of parentProtocolsList) {
    if (baseParent.deprecated) continue;

    const enriched = parentMetaById.get(baseParent.id);
    const children = childrenByParent.get(baseParent.id) ?? [];

    let tvl: number | null = null;
    const chainTvls: { [chain: string]: number } = {};
    const childProtocols: ChildProtocol[] = [];
    let inferredSymbol: string | null = null;

    for (const child of children) {
      const meta = childMetadataById.get(child.defillamaId);
      const excludeFromParent =
        meta?.excludeTvlFromParent === true ||
        meta?.tokensExcludedFromParent !== undefined;

      const childTvl = child.tvl;

      if (!excludeFromParent) {
        if (childTvl !== null) tvl = (tvl ?? 0) + childTvl;

        for (const [chain, value] of Object.entries(child.chainTvls)) {
          const tvlValue = value?.tvl;
          if (typeof tvlValue !== "number") continue;
          chainTvls[chain] = (chainTvls[chain] ?? 0) + tvlValue;
        }
      }

      if (inferredSymbol === null && child.symbol && child.symbol !== "-") {
        inferredSymbol = child.symbol;
      }

      const childEntry: ChildProtocol = {
        id: child.defillamaId,
        name: child.name,
        symbol: child.symbol && child.symbol !== "-" ? child.symbol : null,
        tvl: childTvl,
        chains: child.chains,
      };
      if (excludeFromParent) childEntry.excludedFromParentTvl = true;
      childProtocols.push(childEntry);
    }

    result.push({
      ...baseParent,
      symbol: baseParent.symbol ?? inferredSymbol ?? null,
      chains: enriched?.chains ?? baseParent.chains,
      mcap: enriched?.mcap ?? null,
      tvl,
      chainTvls,
      childProtocols,
    });
  }

  return result;
}
