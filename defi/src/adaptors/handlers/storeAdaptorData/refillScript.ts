require("dotenv").config();

import '../../../api2/utils/failOnError'
import { Adapter, AdapterType } from "@defillama/dimension-adapters/adapters/types"
import loadAdaptorsData from "../../data"
import { handler2, IStoreAdaptorDataHandlerEvent } from "."
import readline from 'readline';
import sleep from '../../../utils/shared/sleep';


// ================== Script Config ==================

console.log(process.env.type, process.env.protocol, process.env.to, process.env.from, process.env.days, process.env.dry_run, process.env.confirm)
const adapterType = process.env.type ?? AdapterType.DERIVATIVES
let protocolToRun = process.env.protocol ?? 'bluefin' // either protocol display name, module name or id

let toTimestamp: any = process.env.toTimestamp ?? process.env.to ?? '2024-11-30' // enable next line to run to now
// toTimestamp = Date.now()

let fromTimestamp: any = process.env.fromTimestamp ?? process.env.from ?? '2024-09-01' // enable next line to run from the dawn of time
// fromTimestamp = 0

let days = 0 // set to non zero to override date range to run for x days

if (process.env.days) days = parseInt(process.env.days)

const DRY_RUN = process.env.dry_run ? process.env.dry_run === 'true' : true
const SHOW_CONFIRM_DIALOG = process.env.confirm ? process.env.confirm === 'true' : false
const SHOW_CONFIG_TABLE = process.env.hide_config_table !== 'true' 



// ================== Script Config end ==================

const ONE_DAY_IN_SECONDS = 24 * 60 * 60
async function run() {
  await sleep(2000)

  console.log('\n\n\n\n\n')
  console.log('------------------------------------')

  fromTimestamp = getUnixTS(fromTimestamp)
  toTimestamp = getUnixTS(toTimestamp)

  if (fromTimestamp > toTimestamp) {
    console.error('Invalid date range. Start date should be less than end date.')
    return;
  }
  if (!Object.values(AdapterType).includes(adapterType as any)) {
    console.error('Invalid adapter type.', adapterType, ' valid types are:', Object.values(AdapterType))
    return;
  }
  const { protocolAdaptors, importModule } = loadAdaptorsData(adapterType as AdapterType)
  let protocol = protocolAdaptors.find(p => p.displayName === protocolToRun || p.module === protocolToRun || p.id === protocolToRun)

  if (!protocol) {
    console.error('Protocol not found')
    return;
  }

  protocolToRun = protocol.displayName
  const adaptor: Adapter = (await importModule(protocol.module)).default;
  const adapterVersion = adaptor.version
  const isVersion2 = adapterVersion === 2

  if (!days)
    days = getDaysBetweenTimestamps(fromTimestamp, toTimestamp)

  const configObj = {
    'Start date': new Date(fromTimestamp * 1000).toLocaleDateString(),
    'End date': new Date(toTimestamp * 1000).toLocaleDateString(),
    'No. of Days': days,
    'Adapter Type': adapterType,
    'Protocol to run': protocolToRun,
    'Dry Run': DRY_RUN,
    isVersion2,
  }

  if (SHOW_CONFIG_TABLE) {
    console.log('Script config: \n\n')
    console.table(configObj)
    console.log('\n\n')
  
    if (SHOW_CONFIRM_DIALOG) {
      const userInput = (await prompt('Do you want to continue? (y/n): '))?.toLowerCase();
      if (userInput !== 'y' && userInput !== 'yes')
        return;
    }
  }

  let currentDayEndTimestamp = toTimestamp
  // if (!isVersion2) currentDayEndTimestamp += ONE_DAY_IN_SECONDS 
  let i = 0

  while (days > 0) {
    const eventObj: IStoreAdaptorDataHandlerEvent = {
      timestamp: currentDayEndTimestamp,
      adapterType: adapterType as any,
      isDryRun: DRY_RUN,
      protocolNames: new Set([protocolToRun]),
      isRunFromRefillScript: true,
    }

    console.log(++i, 'refilling data on', new Date((currentDayEndTimestamp - 100) * 1000).toLocaleDateString())
    await handler2(eventObj)
    
    days--
    currentDayEndTimestamp -= ONE_DAY_IN_SECONDS
  }

}


function getUnixTS(i: any) {
  if (typeof i === 'string') {
    if (/^\d+$/.test(i)) {
      i = parseInt(i, 10);
    } else {
      const date = new Date(i.includes('T') ? i : `${i}T00:00:00Z`); // setting timezone as UTC
      return Math.floor(date.getTime() / 1000);
    }
  }
  if (typeof i === 'number') {
    return i > 9999999999 ? Math.floor(i / 1000) : i;
  } else {
    throw new Error('Invalid input type');
  }
}

function getDaysBetweenTimestamps(from: number, to: number): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const differenceInMilliseconds = (to * 1000) - (from * 1000);
  return Math.floor(differenceInMilliseconds / millisecondsPerDay);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function prompt(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

console.time('Script execution time')

run().catch(console.error).then(() => {
  console.timeEnd('Script execution time')
  process.exit(0)
})
