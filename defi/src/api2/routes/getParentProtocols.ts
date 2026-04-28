import parentProtocolsList from "../../protocols/parentProtocols";
import type { IParentProtocol } from "../../protocols/types";
import type { LiteProtocol } from "../../types";

interface ChildProtocol {
  id: string;
  name: string;
  tvl: number | null;
  chains: string[];
}

export interface ParentProtocolEntry extends IParentProtocol {
  tvl: number | null;
  chainTvls: { [chain: string]: number };
  mcap: number | null;
  childProtocols: ChildProtocol[];
}

interface Protocols2DataLike {
  protocols: LiteProtocol[];
  parentProtocols: Array<IParentProtocol & { mcap?: number | null; chains?: string[] }>;
}

export function getParentProtocolsInternal(
  protocols2Data: Protocols2DataLike,
): ParentProtocolEntry[] {
  const { protocols, parentProtocols } = protocols2Data;

  const childrenByParent = new Map<string, LiteProtocol[]>();
  for (const protocol of protocols) {
    const parentId = protocol.parentProtocol;
    if (!parentId) continue;
    const bucket = childrenByParent.get(parentId);
    if (bucket) {
      bucket.push(protocol);
    } else {
      childrenByParent.set(parentId, [protocol]);
    }
  }

  const parentMetaById = new Map<string, IParentProtocol & { mcap?: number | null; chains?: string[] }>();
  for (const parent of parentProtocols) {
    parentMetaById.set(parent.id, parent);
  }

  const result: ParentProtocolEntry[] = [];

  for (const baseParent of parentProtocolsList) {
    if (baseParent.deprecated) continue;

    const enriched = parentMetaById.get(baseParent.id);
    const children = childrenByParent.get(baseParent.id) ?? [];

    let tvl: number | null = null;
    const chainTvls: { [chain: string]: number } = {};
    const childProtocols: ChildProtocol[] = [];

    for (const child of children) {
      if (typeof child.tvl === "number") {
        tvl = (tvl ?? 0) + child.tvl;
      }
      if (child.chainTvls) {
        for (const [chain, value] of Object.entries(child.chainTvls)) {
          const tvlValue = value?.tvl;
          if (typeof tvlValue !== "number") continue;
          chainTvls[chain] = (chainTvls[chain] ?? 0) + tvlValue;
        }
      }
      childProtocols.push({
        id: child.defillamaId,
        name: child.name,
        tvl: typeof child.tvl === "number" ? child.tvl : null,
        chains: Array.isArray(child.chains) ? child.chains : [],
      });
    }

    result.push({
      ...baseParent,
      chains: enriched?.chains ?? [],
      mcap: enriched?.mcap ?? null,
      tvl,
      chainTvls,
      childProtocols,
    });
  }

  return result;
}
