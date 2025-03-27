import { AdapterType, } from "@defillama/dimension-adapters/adapters/types";
import protocols from "../../protocols/data";
import getAdapterConfig from './index'
const _protocolMap = {} as any
for (const protocol of protocols) {
  _protocolMap[protocol.id] = protocol
}

export default function getDuplicatesBetweenAdapterTypes() {
  const aTypes: AdapterType[] = Object.values(AdapterType).filter((aType) => ![AdapterType.PROTOCOLS, AdapterType.FEES].includes(aType))
  const ids: any = {}
  const response: any = []

  for (const aType of aTypes) {
    const _ids = [] as string[]
    const { protocolMap } = getAdapterConfig(aType)
    for (const protocol of Object.values(protocolMap) as any[]) {
      if (protocol.protocolsData) {
        Object.values(protocol.protocolsData).forEach((p: any) => {
          if (!_protocolMap[p.id]) {
            console.log('Dimensions: protocol data id not found in protocols/data.ts file', p.id, typeof p.id, aType, p, protocol.id, protocol.name, _protocolMap[p.id])
            response.push({ aType, protocol, protocolData: p })
          }
          _ids.push(p.id)
        })
      } else {
        if (!_protocolMap[protocol.id]) {
          console.log('Dimensions protocol id not found in protocols/data.ts file', protocol.id, protocol.name, aType)
          response.push({ aType, protocol })
        }
        _ids.push(protocol.id)
      }
    }

    ids[aType] = _ids
  }

  const adapterCount = aTypes.length


  for (let i = 0; i < adapterCount; i++) {
    const aType = aTypes[i]
    for (let j = i + 1; j < adapterCount; j++) {
      const aType2 = aTypes[j]
      const dups = findDups(ids[aType], ids[aType2])
      if (dups.length) {
        console.log(`Dimensions: uplicates between ${aType} and ${aType2}:`, dups.join(', '), 'count:', dups.length)
        response.push({ aType, aType2, dups })
      }
    }
  }

  return response

  function findDups(arry1: string[], arry2: string[]) {
    const dups = [] as string[]
    for (const item of arry1) {
      if (arry2.includes(item)) {
        dups.push(item)
      }
    }
    return dups
  }
}

getDuplicatesBetweenAdapterTypes()