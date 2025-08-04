
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { AdaptorRecordType, ProtocolAdaptor } from "../data/types"
import { getTimestampString } from "../../api2/utils"
import { AdaptorRecord } from "./adaptor-record"

function toStartOfDay(unixTimestamp: number) {
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

export class AdapterRecord {
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

  static formAdaptorRecord2({ adaptorRecords, protocolType, adapterType, protocol, configIdMap, }: {
    adaptorRecords: {
      [key: string]: AdaptorRecord
    },
    protocolType?: ProtocolType,
    adapterType: AdapterType,
    protocol: ProtocolAdaptor,
    configIdMap: any,
  }): AdapterRecord | null {
    // clone & clean to be safe
    const data: DataJSON = { aggregated: {} }
    let eventTimestamp: number
    const adaptorId = protocolType === ProtocolType.CHAIN ? `chain#${protocol.id}` : protocol.id
    Object.keys(adaptorRecords).forEach((key: any) => transformRecord((adaptorRecords as any)[key].getCleanAdaptorRecord(), key))

    if (!eventTimestamp!) {
      console.info('empty record?')
      return null
    }

    return new AdapterRecord({ data, adaptorId, adapterType, timestamp: eventTimestamp, protocolType, })


    function transformRecord(record: AdaptorRecord | null, key: AdaptorRecordType) {
      if (!record) return;
      eventTimestamp = record.timestamp
      let value = 0
      const chains: {
        [chain: string]: number
      } = {}
      Object.keys(record.data).forEach((chain: any) => {
        const chainData: any = record.data[chain]
        chain = chain.endsWith('_key') ? chain.slice(0, -4) : chain
        Object.keys(chainData).forEach((key: any) => {
          const chainDataKey: number = chainData[key]
          value += chainDataKey
          chains[chain] = (chains[chain] ?? 0) + chainDataKey
        })
      })
      data.aggregated[key] = { value, chains, }
    }
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
