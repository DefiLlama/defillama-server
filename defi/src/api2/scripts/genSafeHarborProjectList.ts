import axios from 'axios'
import * as sdk from '@defillama/sdk'

import protocols, { protocolsById } from "../../protocols/data";
import parentProtocols, { parentProtocolsById, } from "../../protocols/parentProtocols";
import { sluggifyString } from "../../utils/sluggify";
import { SAFE_HARBOR_PROJECTS_CACHE_KEY } from '../constants';

const protocolsByParentId: {
  [id: string]: string[]
} = {}
const slugIdMap: any = {}

protocols.forEach(p => {
  slugIdMap[sluggifyString(p.name)] = p.id
  if (p.parentProtocol) {
    if (!protocolsByParentId[p.parentProtocol]) {
      protocolsByParentId[p.parentProtocol] = []
    }
    protocolsByParentId[p.parentProtocol].push(p.id)
  }
})

parentProtocols.forEach(p => {
  slugIdMap[sluggifyString(p.name)] = p.id
})

export async function generateSafeHarborProjectList() {
  const { data } = await axios.get('https://safeharbor.securityalliance.org/api/v1/agreements')
  const results: any = {}
  data.forEach((item: any) => {
    const protocolId = slugIdMap[item.slug];
    if (!protocolId) {
      console.log('No matching protocol for', item.name, item.website)
      return;
    }

    results[protocolId] = true
    /* const protocol = protocolsById[protocolId];
    const parentProtocol = parentProtocolsById[protocolId]

    if (protocol && protocol.parentProtocol) {
      results[protocol.parentProtocol] = true;
      protocolsByParentId[protocol.parentProtocol]?.forEach((childId) => {
        results[childId] = true;
      });
    }

    if (parentProtocol) {
      protocolsByParentId[protocolId]?.forEach((childId) => {
        results[childId] = true;
      });
    } */
  })

  await sdk.cache.writeCache(SAFE_HARBOR_PROJECTS_CACHE_KEY, results)
  return results
}


if (!process.env.IS_NOT_SCRIPT_MODE)
  generateSafeHarborProjectList().then(console.table).catch(console.error).then(() => {
    process.exit(0);
  })