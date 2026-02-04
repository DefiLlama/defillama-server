
import { AdapterType, ProtocolType, AdaptorRecordType, IJSON, ProtocolAdaptor } from "../data/types"
import { getTimestampString } from "../../api2/utils"
import { getUnixTimeNow } from "../../api2/utils/time"
import { humanizeNumber } from "@defillama/sdk"

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
}

type ValidationOptions = {
  getSignificantValueThreshold: (s: string) => number,
  getSpikeThreshold?: (s: string) => number,
  recentData: any,
  skipDefaultSpikeCheck?: boolean,
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
  name?: string

  constructor({ data, adaptorId, timestamp, adapterType, breakdownByLabel, breakdownByLabelByChain, name }: {
    data: DataJSON,
    adaptorId: string,
    timestamp: number,
    adapterType: AdapterType,
    protocolType?: ProtocolType,
    breakdownByLabel?: IJSON<IJSON<number>>
    breakdownByLabelByChain?: IJSON<IJSON<IJSON<number>>>
    name?: string
  }) {
    this.data = data
    this.timeS = getTimestampString(timestamp)
    this.timestamp = timestamp
    this.adapterType = adapterType
    this.id = adaptorId
    this.breakdownByLabel = breakdownByLabel
    this.breakdownByLabelByChain = breakdownByLabelByChain
    this.name = name
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

    return new AdapterRecord2({ data, adaptorId: protocol.id2, adapterType, timestamp: timestamp!, protocolType, breakdownByLabel: jsonData.breakdownByLabel, breakdownByLabelByChain: jsonData.breakdownByLabelByChain, name: protocol.name })


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

  validateWithRecentData(options: ValidationOptions): any {
    const spikeError = this.checkSpikes(options)
    if (spikeError) return spikeError
    return null
  }

  checkSpikes(options: ValidationOptions): any {
    const { recentData, getSpikeThreshold, getSignificantValueThreshold, } = options
    const aggData: any = this.data.aggregated
    const isDatapointOlderThanAMonth = (getUnixTimeNow() - this.timestamp) > 31 * 24 * 60 * 60
    const hasTooFewDatapoints = !recentData || recentData.tooFewRecords

    if (hasTooFewDatapoints) { // we dont have enough data to compare with, do general spike check

      if (options.skipDefaultSpikeCheck) return; // skip the default spike check for this adapter


      for (const dataType of Object.keys(aggData)) {
        if (dataType.startsWith('t')) continue;  // skip accumulative types

        const { value }: { value: number } = aggData[dataType]
        const triggerValue = getSpikeThreshold!(dataType)

        const absoluteValue = Math.abs(value) //negative spikes should be blocked too

        if (absoluteValue >= triggerValue) {
          return this.getValidationError({
            message: `${dataType}: ${humanizeNumber(value)} >= ${humanizeNumber(triggerValue)} (default threshold)`,
            type: 'spike',
            metadata: {
              hasRecentData: recentData,
              tooFewDataPoints: recentData?.tooFewDataPoints,
              isDatapointOlderThanAMonth,
            }
          })
        }
      }

      return;
    }


    // validate using past data


    for (const dataType of Object.keys(aggData)) {
      if (dataType.startsWith('t')) continue;  // skip accumulative types

      const { value }: { value: number } = aggData[dataType]
      let triggerValue = getSpikeThreshold!(dataType)
      let minSignificantValue = getSignificantValueThreshold(dataType)

      if (isDatapointOlderThanAMonth) {
        minSignificantValue *= 5 // for old datapoints, we increase the base level to avoid false positives
        triggerValue *= 5  // for old datapoints, we increase the spike trigger level to avoid false positives
      }

      const absoluteValue = Math.abs(value); //negative spikes should be blocked too

      if (absoluteValue < minSignificantValue) continue; // no need to check for spikes if value is below base level

      const monthStats = recentData?.dimStats?.[dataType]?.monthStats ?? {
        highest: minSignificantValue
      }


      // normally, we call it a spike if it is 5x the highest datapoint in the last month
      // but if value is higher than baseline spike config (say 10M for dex volume), then we treat 3x a spike
      let spikeThresholdRatio = 5
      let currentRatio = absoluteValue / monthStats.highest
      if (monthStats.highest > triggerValue) spikeThresholdRatio = 3

      if (currentRatio >= spikeThresholdRatio) {
        return this.getValidationError({
          message: `${dataType}: ${humanizeNumber(value)} > ${humanizeNumber(monthStats.highest)} (highest) (ratio: ${Number(currentRatio).toFixed(2)}x)`,
          type: 'spike',
        })
      }
    }
  }

  checkDrop(options: ValidationOptions): any {
    const { recentData, } = options
    const aggData: any = this.data.aggregated
    const isDatapointOlderThanAMonth = (getUnixTimeNow() - this.timestamp) > 31 * 24 * 60 * 60


    // skip the drop check if:
    //  - recent data is missing
    //  - too few datapoints
    //  - it is a small protocol 
    //  - the datapoint is older than a month
    const skipCheck = !recentData || recentData.tooFewRecords || !recentData.hasSignificantData ||isDatapointOlderThanAMonth

    if (skipCheck) return;


    // validate using past data


    for (const dataType of Object.keys(aggData)) {
      if (dataType.startsWith('t')) continue;  // skip accumulative types

      let { value }: { value: number } = aggData[dataType]
      const { monthStats, hasSignificantData } = recentData?.dimStats?.[dataType] ?? {}
      if (!monthStats || !hasSignificantData || !monthStats.lowest || !monthStats.median) continue; // no data to compare with or no significant data for given metric in the past

      if (value < 500) value = 500 // treat small values as 500 to avoid false positives
      const isDrop = value / monthStats.lowest  < 1/3 // current value is less than 33% of the lowest value in the last month

      if (isDrop) {
        return this.getValidationError({
          message: `${dataType}: ${humanizeNumber(value)} < ${humanizeNumber(monthStats.lowest)} (ratio: ${Number(value/monthStats.lowest).toFixed(2)}x)`,
          type: 'drop',
        })
      }
    }
  }

  getValidationError(data: { message: string, metadata?: any, type?: string }) {
    return {
      ...data,
      reportTime: getUnixTimeNow() * 1000,  // easier to deal with ms in ES
      adapterType: this.adapterType,
      id: this.id,
      timeS: this.timeS,
      timestamp: this.timestamp,
      name: this.name,
      currentData: JSON.stringify({ data: this.data, blc: this.breakdownByLabelByChain, bl: this.breakdownByLabel }),
    }

  }
}
