import { wrapScheduledLambda } from "../../utils/shared/wrap";
import invokeLambda from "../../utils/shared/invokeLambda";
import type { IHandlerEvent as IStoreAdaptorDataHandlerEvent } from './storeAdaptorData'
import { handler as storeAdaptorData } from "./storeAdaptorData";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import data from "../data";

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const STEP = 10;

export interface IHandlerEvent {
  type: AdapterType
  backfill: Array<{
    dexNames: string[]
    timestamp: IStoreAdaptorDataHandlerEvent['timestamp']
    chain?: IStoreAdaptorDataHandlerEvent['chain']
    adaptorRecordTypes?: IStoreAdaptorDataHandlerEvent['adaptorRecordTypes']
    protocolVersion?: IStoreAdaptorDataHandlerEvent['protocolVersion']
  }>
}

export const handler = async (event: IHandlerEvent) => {
  console.log("event", event)
  const type = event.type
  // TODO separate those that need to be called on the hour and those using graphs with timestamp
  if (event.backfill) {
    const adaptorsData = data(type)
    console.info("Backfill event", event.backfill.length)
    for (const bf of event.backfill) {
      const protocolIndexes: IStoreAdaptorDataHandlerEvent['protocolIndexes'] = []
      for (const dexName of bf.dexNames) {
        const dexIndex = adaptorsData.default.findIndex(va => va.module === dexName)
        if (dexIndex >= 0)
          protocolIndexes.push(dexIndex)
      }
      await invokeLambdas(protocolIndexes, type, bf.timestamp, bf.chain, bf.adaptorRecordTypes, bf.protocolVersion)
    }
  }
  else if (type) {
    const adaptorsData = data(type)
    const protocolIndexes = Array.from(Array(adaptorsData.default.length).keys())
    await invokeLambdas(protocolIndexes, type)
  }
  else {
    Promise.all(
      [
        AdapterType.FEES,
        AdapterType.OPTIONS,
        AdapterType.INCENTIVES,
        AdapterType.AGGREGATORS,
        AdapterType.DEXS,
        AdapterType.PROTOCOLS
      ].map(type => invokeLambda(`defillama-prod-triggerStoreAdaptorData`, { type }))
    )
  }
};

const invokeLambdas = async (
  protocolIndexes: IStoreAdaptorDataHandlerEvent['protocolIndexes'],
  adaptorType: AdapterType,
  timestamp?: IStoreAdaptorDataHandlerEvent['timestamp'],
  chain?: IStoreAdaptorDataHandlerEvent['chain'],
  adaptorRecordTypes?: IStoreAdaptorDataHandlerEvent['adaptorRecordTypes'],
  protocolVersion?: IStoreAdaptorDataHandlerEvent['protocolVersion']
) => {
  shuffleArray(protocolIndexes);
  for (let i = 0; i < protocolIndexes.length; i += STEP) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i + STEP),
      timestamp,
      adaptorType: adaptorType,
      chain,
      adaptorRecordTypes,
      protocolVersion
    };
    console.info(`Storing adaptor data: ${protocolIndexes} ${timestamp} ${adaptorType}`)
    const storeFunction = process.env.runLocal === 'true' ? storeAdaptorData : runStoreAdaptorData
    // if (process.env.runLocal === 'true') await delay(1000)
    await storeFunction(event);
  }
}

export const runStoreAdaptorData = async (e: IStoreAdaptorDataHandlerEvent) => invokeLambda(`defillama-prod-storeAdaptorData`, e)
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default wrapScheduledLambda(handler);
