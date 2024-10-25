
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { AdaptorRecord, AdaptorRecordType, } from "./adaptor-record"
import { ProtocolAdaptor } from "../data/types"
import { getTimestampString } from "../../api2/utils"

export function toStartOfDay(unixTimestamp: number) {
  const date = new Date(unixTimestamp * 1e3)
  date.setUTCHours(0, 0, 0, 0)
  return Math.floor(date.getTime() / 1000)
}

type IRecordAdaptorRecordData = {
  value: number
  chains: {
    [chain: string]: number
  }
}

type DataJSON = {
  aggregated: {
    [key in AdaptorRecordType]?: IRecordAdaptorRecordData
  },
  breakdown?: {
    [versionKey: string]: {
      [key in AdaptorRecordType]?: IRecordAdaptorRecordData
    }
  }
}

export class AdapterRecord2 {
  data: DataJSON
  timeS: string
  timestamp: number
  adapterType: AdapterType
  protocolType?: ProtocolType
  id: string

  constructor({ data, adaptorId, timestamp, adapterType, }: {
    data: DataJSON,
    adaptorId: string,
    timestamp: number,
    adapterType: AdapterType,
    protocolType?: ProtocolType,
  }) {
    this.data = data
    this.timeS = getTimestampString(timestamp)
    this.timestamp = timestamp
    this.adapterType = adapterType
    this.id = adaptorId
  }

  static formAdaptarRecord2({ adaptorRecords, protocolType, adapterType, protocol, configIdMap, skipZeroValue = false }: {
    adaptorRecords: {
      [key: string]: AdaptorRecord
    },
    protocolType?: ProtocolType,
    adapterType: AdapterType,
    protocol: ProtocolAdaptor,
    configIdMap: any,
    skipZeroValue?: boolean
  }): AdapterRecord2 | null {
    // clone & clean to be safe
    const data: DataJSON = { aggregated: {} }
    const adaptorId = protocol.id2
    const configItem = configIdMap[adaptorId] ?? configIdMap[protocol.id]
    const hasBreakdown = !!configItem.protocolsData
    let whitelistedVersionKeys = new Set(hasBreakdown ? Object.keys(configItem.protocolsData) : [protocol.module])
    const skipAdapterKeyCheck = !hasBreakdown && !protocol.isProtocolInOtherCategories
    let timestamp
    Object.keys(adaptorRecords).forEach((key: any) => transformRecord((adaptorRecords as any)[key].getCleanAdaptorRecord(), key))

    if (!timestamp || Object.keys(data.aggregated).length === 0) {
      // console.info('empty record?')
      if (Object.keys(data.aggregated).length)
        console.info('empty record?', skipAdapterKeyCheck, protocol.module, protocol.id2, protocol.name, JSON.stringify(adaptorRecords), JSON.stringify(data.aggregated), protocolType, adapterType)
      return null
    }

    return new AdapterRecord2({ data, adaptorId, adapterType, timestamp: timestamp!, protocolType, })


    function transformRecord(record: AdaptorRecord | null, key: AdaptorRecordType) {
      if (!record) return;

      timestamp = record.timestamp
      let value = 0
      const chains: { [chain: string]: number } = {}
      let breakdown: any = {}

      Object.keys(record.data).forEach((chain: any) => {
        const chainData: any = record.data[chain]
        chain = chain.endsWith('_key') ? chain.slice(0, -4) : chain
        Object.keys(chainData).forEach((key: any) => {
          if (!skipAdapterKeyCheck && !whitelistedVersionKeys.has(key)) return;
          let chainDataKey: number = chainData[key]
          if (typeof chainDataKey !== 'number') {
            if (!(typeof chainDataKey === 'object' && Object.keys(chainDataKey).length === 0))
              console.log('invalid chainDataKey', chainDataKey, chain, key, protocol.id2, protocol.name, protocolType, adapterType)
            return;
          }
          chainDataKey = Math.round(chainDataKey)
          value += chainDataKey
          chains[chain] = (chains[chain] ?? 0) + chainDataKey
          if (hasBreakdown) {
            if (!breakdown[key]) {
              breakdown[key] = {
                value: 0,
                chains: {},
              }
            }
            breakdown[key].value += chainDataKey
            breakdown[key].chains[chain] = chainDataKey
          }
        })
      })

      if (skipZeroValue && value === 0) return;

      data.aggregated[key] = { value, chains, }
      if (hasBreakdown) {
        if (!data.breakdown) data.breakdown = {}
        data.breakdown[key] = breakdown
      }

    }
  }

  getUniqueKey() {
    return `${this.adapterType}#${this.id}#${this.timeS}`
  }

  getPGItem() {
    return {
      id: this.id,
      type: this.adapterType,
      timeS: this.timeS,
      timestamp: this.timestamp,
      data: this.data,
    }
  }


  /* getHourlyPGItem() {
    return {
      timestamp: this.timestamp,
      type: this.adapterType,
      id: this.id,
      data: JSON.stringify(this.data),
    }
  } */

  getDDBItem() {
    return {
      SK: toStartOfDay(this.timestamp),
      PK: `daily#${this.adapterType}#${this.id}`,
      data: this.data,
    }
  }

  getHourlyDDBItem() {
    return {
      SK: this.timestamp,
      PK: `hourly#${this.adapterType}#${this.id}`,
      data: this.data,
    }
  }
}
