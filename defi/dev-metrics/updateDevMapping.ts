import { writeJSON, DATA_MAPPING_FILE, } from './utils/cache'

import protocols from '../src/protocols/data'
import parentProtocols from '../src/protocols/parentProtocols'
import { chainCoingeckoIds } from '../src/utils/normalizeChain'

const protocolMap: any = {}

protocols.forEach((i: any) => {
  if (!i.github) return;
  protocolMap[i.id] = {
    type: 'protocol',
    ...i,
  }
})

parentProtocols.forEach((i: any) => {
  if (!i.github) return;
  protocolMap[i.id] = {
    type: 'parent-protocol',
    ...i,
  }
})

Object.entries(chainCoingeckoIds).forEach((i: any) => {
  if (!i[1].github) return;
  protocolMap[i[0]] = {
    type: 'chain',
    ...i[1],
  }
})

writeJSON(DATA_MAPPING_FILE, protocolMap, { compressed: false, })