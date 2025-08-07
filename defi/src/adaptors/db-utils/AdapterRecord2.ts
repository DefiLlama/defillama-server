
import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types"
import { AdaptorRecordType, IJSON, ProtocolAdaptor } from "../data/types"
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
  breakdownByLabel?: IJSON<IJSON<number>>
  breakdownByLabelByChain?: IJSON<IJSON<IJSON<number>>>
  id: string

  constructor({ data, adaptorId, timestamp, adapterType, breakdownByLabel, breakdownByLabelByChain, }: {
    data: DataJSON,
    adaptorId: string,
    timestamp: number,
    adapterType: AdapterType,
    protocolType?: ProtocolType,
    breakdownByLabel?: IJSON<IJSON<number>>
    breakdownByLabelByChain?: IJSON<IJSON<IJSON<number>>>
  }) {
    this.data = data
    this.timeS = getTimestampString(timestamp)
    this.timestamp = timestamp
    this.adapterType = adapterType
    this.id = adaptorId
    this.breakdownByLabel = breakdownByLabel
    this.breakdownByLabelByChain = breakdownByLabelByChain
  }

  static formAdaptarRecord2({ jsonData, protocolType, adapterType, protocol, }: {
    jsonData: {
      timestamp?: number,
      aggregated: IJSON<IRecordAdaptorRecordData>,
      breakdownByLabel?: IJSON<IJSON<number>>
      breakdownByLabelByChain?: IJSON<IJSON<IJSON<number>>>
    },
    protocolType?: ProtocolType,
    adapterType: AdapterType,
    protocol: ProtocolAdaptor,
  }): AdapterRecord2 | null {

    // clone to be safe 
    jsonData = JSON.parse(JSON.stringify(jsonData))

    let timestamp = jsonData.timestamp
    const data: DataJSON = { aggregated: jsonData.aggregated }

    // validate the jsonData structure
    Object.keys(jsonData.aggregated).forEach((key) => validateRecord((jsonData.aggregated[key])))
    if (typeof timestamp !== 'number' || isNaN(timestamp) || timestamp <= 0) {
      console.error('Invalid timestamp in jsonData', jsonData, protocol.id2, protocol.name, protocolType, adapterType)
      return null
    }

    if (!Object.keys(data.aggregated).length) {
      console.info('empty record?', protocol.module, protocol.id2, protocol.name, JSON.stringify(jsonData), protocolType, adapterType)
      return null
    }

    return new AdapterRecord2({ data, adaptorId: protocol.id2, adapterType, timestamp: timestamp!, protocolType, breakdownByLabel: jsonData.breakdownByLabel, breakdownByLabelByChain: jsonData.breakdownByLabelByChain })


    function validateRecord(record: any) {
      const printRecordInfo = () => console.info('invalid chainDataKey', JSON.stringify(record), protocol.id2, protocol.name, protocolType, adapterType)
      if (!record) {
        printRecordInfo()
        throw new Error('Invalid record');
      }

      const { value, chains } = record;

      if (typeof value !== 'number' || isNaN(value)) {
        printRecordInfo()
        throw new Error('Invalid value in record');
      }

      if (typeof chains !== 'object' || chains === null) {
        printRecordInfo()
        throw new Error('Invalid chains in record');
      }

      if (Object.keys(chains).length === 0) {
        printRecordInfo()
        throw new Error('Chains object is empty');
      }

      for (const [chain, chainValue] of Object.entries(chains)) {
        if (typeof chain !== 'string' || chain.trim() === '') {
          printRecordInfo()
          throw new Error('Invalid chain name in chains');
        }
        if (typeof chainValue !== 'number' || isNaN(chainValue)) {
          printRecordInfo()
          throw new Error(`Invalid value for chain ${chain} in chains`);
        }
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
      bl: this.breakdownByLabel,
      blc: this.breakdownByLabelByChain,
    }
  }

  getDDBItem() {
    return {
      SK: toStartOfDay(this.timestamp),
      PK: `daily#${this.adapterType}#${this.id}`,
      data: this.data,
      bl: this.breakdownByLabel,
      blc: this.breakdownByLabelByChain,
      timestamp: this.timestamp,
    }
  }

  getHourlyDDBItem() {
    return {
      SK: this.timestamp,
      PK: `hourly#${this.adapterType}#${this.id}`,
      data: this.data,
      bl: this.breakdownByLabel,
      blc: this.breakdownByLabelByChain,
    }
  }
}
