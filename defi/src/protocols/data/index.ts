import type { Hallmark, IParentProtocol, Protocol } from "../types";
import { setProtocolCategory, TagCatetgoryMap } from "../tags";
import parentProtocols from "../parentProtocols";
import { sluggifyString } from "../../utils/sluggify";
import { importAdapter } from "../../utils/imports/importAdapter";
import { isDoubleCounted } from "../../utils/normalizeChain";

import fs from 'fs';
import path from 'path';
import { DATA_FILES } from "../../constants";

// Check if protocols.json exists
const protocolsJsonPath = path.resolve(__dirname, '../../utils/imports/protocols.json');
let protocols: Protocol[] = [];

if (fs.existsSync(protocolsJsonPath)) {
  protocols = require(protocolsJsonPath)
} else {
  console.log('hmmm, looks like prebuild step was not run, falling back to data.ts')
  for (const file of DATA_FILES) {
    const module = require(path.join(__dirname, `../${file}`));
    protocols = protocols.concat(module.default);
  }
}

// filter out disabled protocols
protocols = protocols.filter(i => !i.disabled)

export type { Protocol };

protocols.forEach(setProtocolCategory)

protocols.forEach((protocol: Protocol) => {
  // TODO: this is a hack to remove bad addresses like 'sui:-', we should fix this in the listings and remove this code
  if (typeof protocol.address === "string" && protocol.address.endsWith(':-'))
    protocol.address = null
  if (protocol.deadUrl === true || protocol.rugged === true) {
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

  if (protocol.deadUrl === true || protocol.rugged === true) {
    protocol.url = ""
  }

  const childProtocols = parentChildProtocolMap[protocol.id] ?? []
  if (!childProtocols.length) return;

  const fields = ['gecko_id', 'cmcId', 'symbol', 'address'] as (keyof Protocol)[]

  for (const field of fields) {
    if ((protocol as Protocol)[field] !== undefined) continue;  // already has the field
    const childValue = childProtocols.find((p) => p[field] !== undefined)?.[field]
    if (childValue !== undefined) {
      (protocol as any)[field] = childValue
    }
  }

  // Merge parent + child stablecoins
  const mergedStablecoins = new Set<string>(protocol.stablecoins ?? []);
  childProtocols.forEach((child) => {
    (child.stablecoins ?? []).forEach((s: string) => mergedStablecoins.add(s));
  });
  if (mergedStablecoins.size > 0) {
    protocol.stablecoins = [...mergedStablecoins];
  }
})


export type _InternalProtocolMetadata = {
  id: string;
  category: string;
  categorySlug: string;
  isLiquidStaking: boolean;
  isDoublecounted: boolean;
  slugTagSet: Set<string>;
  hasTvl: boolean;
  isDead: boolean;
  misrepresentedTokens: boolean;
  methodology?: string;
  hallmarks?: Hallmark[];
  tvlCodePath?: string;
  hasChainSlug: (chainSlug: string) => boolean;
}

export const _InternalProtocolMetadataMap: { [id: string]: _InternalProtocolMetadata } = {}

export function setProtocolMetadata(protocol: Protocol) {
  try {

    let category = protocol.tags?.length ? TagCatetgoryMap[protocol.tags[0]] : protocol.category
    if (!category) {
      console.error(`Check why category is missing for ${protocol.name}`)
      category = ''
    }
    const slugTagSet = new Set((protocol.tags || []).map(tag => sluggifyString(tag)))
    const module = importAdapter(protocol)
    const isDoublecounted = isDoubleCounted(module.doublecounted, category)

    // copy deadFrom field from tvl module object to protocol object if it exists in the module and not in the protocol, this is to ensure that we can use the deadFrom field in the protocol object for filtering in the UI and other places without having to import the module again
    if (module.deadFrom && !protocol.deadFrom)
      protocol.deadFrom = module.deadFrom

    let modulePath = protocol.module
    if (module.meta?.moduleFilePath)
      modulePath = module.meta.moduleFilePath
    else 
      modulePath = `projects/${modulePath}`

    const metadata = {
      id: protocol.id,
      category,
      categorySlug: sluggifyString(category),
      isLiquidStaking: category === "Liquid Staking",
      slugTagSet,
      isDoublecounted,
      isDead: !!protocol.deadFrom,
      hasTvl: protocol.module !== 'dummy.js',
      misrepresentedTokens: !!module.misrepresentedTokens,
      methodology: module.methodology,
      hallmarks: module.hallmarks,
      tvlCodePath: `https://github.com/DefiLlama/DefiLlama-Adapters/blob/main/${modulePath}`,
      hasChainSlug: (_chainSlug: string) => { throw new Error('Need to pull info from cache first') },
    }

    _InternalProtocolMetadataMap[protocol.id] = metadata

    const protocolMissingFields = ['methodology', 'misrepresentedTokens', 'deadFrom', 'doublecounted', 'tvlCodePath']

    protocolMissingFields.forEach((field) => {
      if ((protocol as any)[field] === undefined) {
        (protocol as any)[field] = (metadata as any)[field]
      }
    })


    let hallmarks = protocol.hallmarks ?? []
    if (module.hallmarks) {
      hallmarks.push(...module.hallmarks)
    }
    hallmarks = convertHallmarkStrings(hallmarks)
    sortHallmarks(hallmarks)

    if (Array.isArray(hallmarks) && hallmarks.length > 0) {
      metadata.hallmarks = hallmarks as any
      protocol.hallmarks = hallmarks as any; // also update the protocol object
    }

  } catch (e) {
    let eMessage = e instanceof Error ? e.message : String(e);
    if (!eMessage.includes('Could not find adapter for'))
      console.error(`Error processing protocol ${protocol.name} (${protocol.id}):`, eMessage)
  }
}

protocols.forEach(setProtocolMetadata)

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

export function sortHallmarks(hallmarks: Hallmark[] | any) {
  if (!Array.isArray(hallmarks)) return hallmarks;
  return hallmarks?.sort((a: any, b: any) => {
    let aTimestamp = a[0];
    if (Array.isArray(aTimestamp)) aTimestamp = aTimestamp[0]; // range hallmarks have [start, end]
    let bTimestamp = b[0];
    if (Array.isArray(bTimestamp)) bTimestamp = bTimestamp[0];
    return aTimestamp - bTimestamp; // sort by timestamp
  });
}

function convertHallmarkStrings(hallmarks: any) {
  if (!Array.isArray(hallmarks)) return hallmarks
  return hallmarks.map((item) => {
    if (typeof item?.[0] === 'string') {
      item[0] = dateStringToTimestamp(item[0])
    }
    if (Array.isArray(item?.[0])) {
      item[0].forEach((subItem, index) => {
        if (typeof subItem === 'string') {
          item[0][index] = dateStringToTimestamp(subItem)
        }
      })
    }
    return item
  }).filter((item) => {
    if (typeof item?.[0] === 'number') return true
    // if it is a range hallmark
    if (Array.isArray(item?.[0] && typeof item[0][0] === 'number' && typeof item[0][1] === 'number')) {
      return true
    }
    return false
  })
}

function dateStringToTimestamp(dateString: any) {

  let timestamp = Math.floor(+new Date(dateString) / 1e3)
  if (!isNaN(timestamp))
    return timestamp
  return dateString
}