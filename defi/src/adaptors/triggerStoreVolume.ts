import { wrapScheduledLambda } from "../utils/shared/wrap";
import invokeLambda from "../utils/shared/invokeLambda";
import type { IHandlerEvent as IStoreAdaptorDataHandlerEvent } from './handlers/storeAdaptorData'
import { handler as storeAdaptorData } from "./handlers/storeAdaptorData";
import { AdapterType } from "@defillama/adaptors/adapters/types";
import data from "./data";

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
  // TODO separate those that need to be called on the hour and those using graphs with timestamp
  const adaptorsData = data(event.type)
  if (event.backfill) {
    console.info("Backfill event", event.backfill.length)
    for (const bf of event.backfill) {
      const protocolIndexes: IStoreAdaptorDataHandlerEvent['protocolIndexes'] = []
      for (const dexName of bf.dexNames) {
        const dexIndex = adaptorsData.default.findIndex(va => va.module === dexName)
        if (dexIndex >= 0)
          protocolIndexes.push(dexIndex)
      }
      await invokeLambdas(protocolIndexes, event.type, bf.timestamp)
    }
  }
  else {
    const protocolIndexes = Array.from(Array(adaptorsData.default.length).keys())
    await invokeLambdas(protocolIndexes, event.type)
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
    console.info(`Storing volume: ${protocolIndexes} ${timestamp}`)
    const storeFunction = process.env.runLocal === 'true' ? storeAdaptorData : runStoreDex
    // if (process.env.runLocal === 'true') await delay(1000)
    await storeFunction(event);
  }
}

export const runStoreDex = async (e: IStoreAdaptorDataHandlerEvent) => invokeLambda(`defillama-prod-storeVolume`, e)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default wrapScheduledLambda(handler);
