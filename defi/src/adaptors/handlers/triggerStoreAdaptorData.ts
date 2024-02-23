import { wrapScheduledLambda } from "../../utils/shared/wrap";
import invokeLambda from "../../utils/shared/invokeLambda";
import type { IHandlerEvent as IStoreAdaptorDataHandlerEvent } from './storeAdaptorData'
import { handler as storeAdaptorData } from "./storeAdaptorData";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import data from "../data";
import { IJSON } from "../data/types";
import { shuffleArray } from "../../utils/shared/shuffleArray";

const STEP = 10;

export interface IHandlerEvent {
  type: AdapterType
  backfill?: Array<{
    dexNames: string[]
    timestamp: IStoreAdaptorDataHandlerEvent['timestamp']
    chain?: IStoreAdaptorDataHandlerEvent['chain']
    adaptorRecordTypes?: IStoreAdaptorDataHandlerEvent['adaptorRecordTypes']
    protocolVersion?: IStoreAdaptorDataHandlerEvent['protocolVersion']
  }>
}

export const ADAPTER_TYPES = Object.values(AdapterType)

export const quarantineList = {
  [AdapterType.FEES]: ["chainlink-vrf-v1", 'chainlink-vrf-v2', 'chainlink-keepers', "dodo"],
  [AdapterType.DEXS]: ["vanswap", "dodo"]
} as IJSON<string[]>

export const handler = async (event: IHandlerEvent) => {
  console.log("event", event)
  const type = event.type
  // TODO separate those that need to be called on the hour and those using graphs with timestamp
  const quarantinedModules = quarantineList[type] ?? []
  if (event.backfill) {
    console.info("Backfill event", event.backfill.length)
    for (const bf of event.backfill) {
      const protocolModules: IStoreAdaptorDataHandlerEvent['protocolModules'] = bf.dexNames.filter(m => !quarantinedModules.includes(m))
      await invokeLambdas(protocolModules, type, bf.timestamp, bf.chain, bf.adaptorRecordTypes, bf.protocolVersion)
      const protocolModulesConfined = bf.dexNames.filter(m => quarantinedModules.includes(m))
      if (protocolModulesConfined.length > 0)
        await Promise.all(protocolModulesConfined.map((confinedModule) => invokeLambdas([confinedModule], type, bf.timestamp, bf.chain, bf.adaptorRecordTypes, bf.protocolVersion)))
    }
  }
  else if (type) {
    const adaptorsData = data(type)
    const protocolModules = adaptorsData.default.filter(m => !quarantinedModules.includes(m.module)).map(m => m.module)
    await invokeLambdas(protocolModules, type)
    const protocolModulesConfined = adaptorsData.default.filter(m => quarantinedModules.includes(m.module)).map(m => m.module)
    await Promise.all(protocolModulesConfined.map((confinedModule) => invokeLambdas([confinedModule], type)))
  }
  else {
    await Promise.all(
      ADAPTER_TYPES.map(type => invokeLambda(`defillama-prod-triggerStoreAdaptorData`, { type }))
    )
  }
};

const invokeLambdas = async (
  protocolModules: IStoreAdaptorDataHandlerEvent['protocolModules'],
  adaptorType: AdapterType,
  timestamp?: IStoreAdaptorDataHandlerEvent['timestamp'],
  chain?: IStoreAdaptorDataHandlerEvent['chain'],
  adaptorRecordTypes?: IStoreAdaptorDataHandlerEvent['adaptorRecordTypes'],
  protocolVersion?: IStoreAdaptorDataHandlerEvent['protocolVersion']
) => {
  shuffleArray(protocolModules);
  for (let i = 0; i < protocolModules.length; i += STEP) {
    const event = {
      protocolModules: protocolModules.slice(i, i + STEP),
      timestamp,
      adaptorType: adaptorType,
      chain,
      adaptorRecordTypes,
      protocolVersion
    };
    console.info(`Storing adaptor data: ${i} ${i + STEP} ${timestamp} ${adaptorType}`)
    const storeFunction = process.env.runLocal === 'true' ? storeAdaptorData : runStoreAdaptorData
    // if (process.env.runLocal === 'true') await delay(1000)
    await storeFunction(event);
  }
}

export const runStoreAdaptorData = async (e: IStoreAdaptorDataHandlerEvent) => invokeLambda(`defillama-prod-storeAdaptorData`, e)
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default wrapScheduledLambda(handler);
