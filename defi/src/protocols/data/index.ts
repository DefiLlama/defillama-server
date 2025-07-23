import type { IParentProtocol, Protocol } from "../types";
import { setProtocolCategory, TagCatetgoryMap } from "../tags";
import parentProtocols from "../parentProtocols";
import { sluggifyString } from "../../utils/sluggify";
import { importAdapter } from "../../utils/imports/importAdapter";
import { isDoubleCounted } from "../../utils/normalizeChain";
import data1 from "../data1";
import data2 from "../data2";
import data3 from "../data3";
import data4 from "../data4";

export type { Protocol };
const protocols = data1.concat(data2, data3, data4);

protocols.forEach(setProtocolCategory)

protocols.forEach((protocol: Protocol) => {
  // TODO: this is a hack to remove bad addresses like 'sui:-', we should fix this in the listings and remove this code
  if (typeof protocol.address === "string" && protocol.address.endsWith(':-'))
    protocol.address = null
  if (protocol.deadUrl === true) {
    protocol.url = "" // kill urls to prevent urls that are dead from having scammers taking them over
  }
})

export default protocols;

export const protocolsById = protocols.reduce((accum, protocol) => {
  accum[protocol.id] = protocol;
  return accum;
}, {} as Record<string, Protocol>);

export const parentChildProtocolMap: { [parentId: string]: Protocol[] } = {}

protocols.forEach((protocol: Protocol) => {
  if (protocol.parentProtocol) {
    if (!parentChildProtocolMap[protocol.parentProtocol]) {
      parentChildProtocolMap[protocol.parentProtocol] = [];
    }
    parentChildProtocolMap[protocol.parentProtocol].push(protocol);
  }
})

// if cmcId/gecko_id/symbol or address is missing in the parent metadata but found in the child metadata, copy it to the parent
parentProtocols.forEach((protocol: IParentProtocol) => {
  const childProtocols = parentChildProtocolMap[protocol.id] ?? []
  if (!childProtocols.length) return;


  const childGeckoId = childProtocols.find((p) => p.gecko_id)?.gecko_id
  const childCmcId = childProtocols.find((p) => p.cmcId)?.cmcId
  const childSymbol = childProtocols.find((p) => p.symbol)?.symbol
  const childAddress = childProtocols.find((p) => p.address)?.address

  if (!protocol.gecko_id && childGeckoId) protocol.gecko_id = childGeckoId
  if (!protocol.cmcId && childCmcId) protocol.cmcId = childCmcId
  if (!protocol.symbol && childSymbol) protocol.symbol = childSymbol
  if (!protocol.address && childAddress) protocol.address = childAddress
})


export type _InternalProtocolMetadata = {
  id: string;
  category: string;
  categoryLowerCase: string;
  categorySlug: string;
  isLiquidStaking: boolean;
  isDoublecounted: boolean;
  slugTagSet: Set<string>;
  hasTvl: boolean;
  hasChainSlug: (chainSlug: string) => boolean;
}

export const _InternalProtocolMetadataMap: { [id: string]: _InternalProtocolMetadata } = {}

protocols.forEach((protocol: Protocol) => {
  try {

    let category = protocol.tags?.length ? TagCatetgoryMap[protocol.tags[0]] : protocol.category
    if (!category) {
      console.error(`Check why category is missing for ${protocol.name}`)
      category = ''
    }
    const slugTagSet = new Set((protocol.tags || []).map(tag => sluggifyString(tag)))
    const module = importAdapter(protocol)
    const isDoublecounted = isDoubleCounted(module.doublecounted, category)

    _InternalProtocolMetadataMap[protocol.id] = {
      id: protocol.id,
      category,
      categoryLowerCase: category.toLowerCase(),
      categorySlug: sluggifyString(category),
      isLiquidStaking: category === "Liquid Staking",
      slugTagSet,
      isDoublecounted,
      hasTvl: protocol.module !== 'dummy.js',
      hasChainSlug: (_chainSlug: string) => { throw new Error('Need to pull info from cache first') },

    }
  } catch (e) {
    let eMessage = e instanceof Error ? e.message : String(e);
    if (!eMessage.includes('Could not find adapter for'))
      console.error(`Error processing protocol ${protocol.name} (${protocol.id}):`, eMessage)
  }
})

export function updateProtocolMetadataUsingCache(protocolAppMetadataMap: any) {
  Object.entries(protocolAppMetadataMap).forEach(([protocolId, metadata]) => {
    const protocolMetadata = _InternalProtocolMetadataMap[protocolId];
    if (!protocolMetadata) {
      return;
    }
    const { chains = [], tvl } = metadata as any;
    const chainSlugSet = new Set(chains.map((chain: string) => sluggifyString(chain)));
    protocolMetadata.hasChainSlug = (chainSlug: string) => chainSlugSet.has(chainSlug);
    protocolMetadata.hasTvl = !!tvl;
  })
}