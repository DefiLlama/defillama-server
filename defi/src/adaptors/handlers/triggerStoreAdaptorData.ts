import { wrapScheduledLambda } from "../../utils/shared/wrap";
import invokeLambda from "../../utils/shared/invokeLambda";
import type { IHandlerEvent as IStoreAdaptorDataHandlerEvent } from './storeAdaptorData'
import { handler as storeAdaptorData } from "./storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
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
  }>
}

export const handler = async (event: IHandlerEvent) => {
  const type = event.type
  // TODO separate those that need to be called on the hour and those using graphs with timestamp
  const adaptorsData = data(type)
  if (event.backfill) {
    console.info("Backfill event", event.backfill.length)
    for (const bf of event.backfill) {
      const protocolIndexes: IStoreAdaptorDataHandlerEvent['protocolIndexes'] = []
      for (const dexName of bf.dexNames) {
        const dexIndex = adaptorsData.default.findIndex(va => va.module === dexName)
        if (dexIndex >= 0)
          protocolIndexes.push(dexIndex)
      }
      await invokeLambdas(protocolIndexes, type, bf.timestamp)
    }
  }
  else if (type) {
    const protocolIndexes = Array.from(Array(adaptorsData.default.length).keys())
    await invokeLambdas(protocolIndexes, type)
  }
  else {
    Promise.all(
      [
        AdapterType.FEES,
        AdapterType.DERIVATIVES,
        AdapterType.INCENTIVES,
        AdapterType.AGGREGATORS
      ].map(type => invokeLambda(`defillama-prod-triggerStoreAdaptorData`, { type }))
    )
  }
};

const invokeLambdas = async (protocolIndexes: IStoreAdaptorDataHandlerEvent['protocolIndexes'], adaptorType: AdapterType, timestamp?: IStoreAdaptorDataHandlerEvent['timestamp']) => {
  shuffleArray(protocolIndexes);
  for (let i = 0; i < protocolIndexes.length; i += STEP) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i + STEP),
      timestamp,
      adaptorType: adaptorType
    };
    console.info(`Storing adaptor data: ${protocolIndexes} ${timestamp} ${adaptorType}`)
    const storeFunction = process.env.runLocal === 'true' ? storeAdaptorData : runStoreAdaptorData
    // if (process.env.runLocal === 'true') await delay(1000)
    await storeFunction(event);
  }
}

export const runStoreAdaptorData = async (e: IStoreAdaptorDataHandlerEvent) => invokeLambda(`defillama-prod-storeAdaptorData`, e)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default wrapScheduledLambda(handler);
