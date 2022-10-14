import { wrapScheduledLambda } from "./utils/shared/wrap";
// TODO pull dexVolumes from db
import volumeAdapters from "./dexVolumes/dexAdapters";
import invokeLambda from "./utils/shared/invokeLambda";
import type { IHandlerEvent as IStoreDexVolumeHandlerEvent } from './dexVolumes/handlers/storeDexVolume'

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const STEP = 10;

export interface IHandlerEvent {
  backfill: Array<{
    dexNames: string[]
    timestamp: IStoreDexVolumeHandlerEvent['timestamp']
  }>
}

const handler = async (event?: IHandlerEvent) => {
  // TODO separate those that need to be called on the hour and those using graphs with timestamp
  if (event?.backfill) {
    console.info("Backfill event", event.backfill)
    for (const bf of event.backfill) {
      const protocolIndexes: IStoreDexVolumeHandlerEvent['protocolIndexes'] = []
      for (const dexName of bf.dexNames) {
        const dexIndex = volumeAdapters.findIndex(va => va.volumeAdapter === dexName)
        if (dexIndex >= 0)
          protocolIndexes.push(dexIndex)
      }
      await invokeLambdas(protocolIndexes, bf.timestamp)
    }
  }
  else {
    const protocolIndexes = [
      volumeAdapters.findIndex(va => va.volumeAdapter === 'bancor'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'balancer'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'dodo'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'hashflow'),
      // volumeAdapters.findIndex(va => va.volumeAdapter === 'wingriders')
      volumeAdapters.findIndex(va => va.volumeAdapter === 'wombat-exchange'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'nomiswap'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'sushiswap'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'minswap'),
      volumeAdapters.findIndex(va => va.volumeAdapter === 'mdex'),
    ]
    await invokeLambdas(protocolIndexes)
  }
};

const invokeLambdas = async (protocolIndexes: IStoreDexVolumeHandlerEvent['protocolIndexes'], timestamp?: IStoreDexVolumeHandlerEvent['timestamp']) => {
  shuffleArray(protocolIndexes);
  for (let i = 0; i < protocolIndexes.length; i += STEP) {
    const event = {
      protocolIndexes: protocolIndexes.slice(i, i + STEP),
      timestamp
    };
    console.info(`Storing volume: ${protocolIndexes} ${timestamp}`)
    const result = await invokeLambda(`defillama-${process.env.stage}-storeVolume`, event);
    console.log("Execution result", result)
  }
}

export default wrapScheduledLambda(handler);
