import '../../../api2/utils/failOnError'

import { handler2 } from ".";
import { AdapterType } from "../../data/types"
import { getUnixTimeNow } from '../../../api2/utils/time';
import { getTimestampAtStartOfDayUTC } from '../../../utils/date';
import { elastic } from '@defillama/sdk';
import { getAllDimensionsRecordsOnDate } from '../../db-utils/db2';
import { ADAPTER_TYPES } from '../../data/types';
import loadAdaptorsData from '../../data';
const MAX_RUNTIME = 1000 * 60 * +(process.env.MAX_RUNTIME_MINUTES ?? 50); // 50 minutes default
const onlyYesterday = process.env.ONLY_YESTERDAY === 'true';  // if set, we refill only yesterday's missing data

let maxConcurrency = 21; // default
if (process.env.DIM_RUN_MAX_CONCURRENCY) {
  const parsed = parseInt(process.env.DIM_RUN_MAX_CONCURRENCY);
  if (!isNaN(parsed)) {
    maxConcurrency = parsed;
  }
}

console.log('This will run with MAX_RUNTIME:', MAX_RUNTIME / 60000, 'minutes');

async function run() {
  const startTimeAll = getUnixTimeNow()
  console.time("**** Run All Adaptor types")

  await Promise.all(ADAPTER_TYPES.map(runAdapterType))

  // const randomizedAdapterTypes = [...ADAPTER_TYPES].sort(() => Math.random() - 0.5)
  // for (const adapterType of randomizedAdapterTypes) {
  //   await runAdapterType(adapterType)
  // }

  async function runAdapterType(adapterType: AdapterType) {
    const startTimeCategory = getUnixTimeNow()
    // if (adapterType !== AdapterType.AGGREGATORS) return;
    const key = "**** Run Adaptor type: " + adapterType
    console.time(key)
    let success = false

    try {

      let yesterdayIdSet: Set<string> = new Set()
      let todayIdSet: Set<string> = new Set()
      let yesterdayDataMap: Map<string, any> = new Map()
      let todayDataMap: Map<string, any> = new Map()

      try {
        const yesterdayData = await getAllDimensionsRecordsOnDate({ adapterType, date: getYesterdayTimeS() });
        const todayData = await getAllDimensionsRecordsOnDate({ adapterType, date: getTodayTimeS() });

        // Create maps
        yesterdayDataMap = new Map(yesterdayData.map((d: any) => [d.id, d]));
        todayDataMap = new Map(todayData.map((d: any) => [d.id, d]));
        todayIdSet = new Set(todayData.map((d: any) => d.id));

        // Load adaptor data to check dependencies and versions
        const dataModule = loadAdaptorsData(adapterType);
        const { protocolAdaptors, importModule } = dataModule;

        // Smart filtering: Build yesterdayIdSet by checking each protocol (similar to handler2 logic)
        const now = new Date();
        const currentHour = now.getUTCHours();
        const startOfTodayTimestamp = getTimestampAtStartOfDayUTC(Math.floor(Date.now() / 1000)); // 00:00 UTC today
        const isAfter1AM = currentHour >= 1;
        const isAfter8AM = currentHour >= 8;

        // Process each protocol to determine if it should be in yesterdayIdSet
        for (const protocol of protocolAdaptors) {
          const id2 = protocol.id2;
          const yesterdayRecord = yesterdayDataMap.get(id2);

          // If no yesterday data exists, don't add to set (will trigger refill)
          if (!yesterdayRecord) {
            continue;
          }

          let includeInSet = true;

          try {
            const adaptor = await importModule(protocol.module);
            const version = adaptor.version ?? 1;
            const runAtCurrTime = adaptor.runAtCurrTime ?? false;
            const hasDuneDependency = adaptor.dependencies?.includes('dune' as any) ?? false;
            const isV1 = version === 1;
            const isV2 = !isV1;

            // Edge case 1: V2 adapters (not runAtCurrTime) with incomplete yesterday data
            // Only applies to V2 adapters that don't run at current time
            // Remove from set to trigger refill for incomplete data after 01:00 UTC
            if (isV2 && !runAtCurrTime && yesterdayRecord.updatedAt && yesterdayRecord.updatedAt < startOfTodayTimestamp && isAfter1AM) {
              includeInSet = false;
              console.log(`Removing ${id2} from yesterdayIdSet - incomplete V2 data (last update: ${new Date(yesterdayRecord.updatedAt * 1000).toISOString()})`)
            }

            // Edge case 2: V1 DUNE adapters with data updated before 08:00 UTC
            // Only applies to V1 adapters with DUNE dependencies
            // Remove from set to trigger refill after 08:00 UTC
            if (includeInSet && isV1 && hasDuneDependency && yesterdayRecord.updatedAt && isAfter8AM) {
              const lastUpdateDate = new Date(yesterdayRecord.updatedAt * 1000);
              const lastUpdateHourUTC = lastUpdateDate.getUTCHours();

              if (lastUpdateHourUTC < 8) {
                includeInSet = false;
                console.log(`Removing ${id2} from yesterdayIdSet - V1 DUNE adapter needs refresh (last update: ${lastUpdateDate.toISOString()}, before 08:00 UTC)`)
              }
            }
          } catch (e) {
            console.error(`importModule error for ${id2} - ${protocol.module}: ${e}`)
            // If we can't load module, include by default to avoid breaking existing adapters
            includeInSet = true;
          }

          if (includeInSet) {
            yesterdayIdSet.add(id2);
          }
        }

      } catch (e) {
        console.error("Error in getAllDimensionsRecordsOnDate", e)
      }
      await handler2({ adapterType, yesterdayIdSet, runType: 'store-all', todayIdSet, maxRunTime: MAX_RUNTIME - 2 * 60 * 1000, onlyYesterday, maxConcurrency })

    } catch (e) {
      console.error("error", e)
      await elastic.addErrorLog({
        error: e as any,
        metadata: {
          application: "dimensions",
          type: 'category',
          name: adapterType,
        }
      })
    }

    console.timeEnd(key)
    const endTimeCategory = getUnixTimeNow()
    await elastic.addRuntimeLog({
      runtime: endTimeCategory - startTimeCategory,
      success,
      metadata: {
        application: "dimensions",
        isCategory: true,
        category: adapterType,
      }
    })

  }

  console.timeEnd("**** Run All Adaptor types")
  const endTimeAll = getUnixTimeNow()
  await elastic.addRuntimeLog({
    runtime: endTimeAll - startTimeAll,
    success: true,
    metadata: {
      application: "dimensions",
      type: 'all',
      name: 'all',
    }
  })
}

setTimeout(() => {
  console.error("Timeout reached, exiting from dimensions-store-all...")
  process.exit(1)
}, MAX_RUNTIME)

run().catch((e) => {
  console.error("Error in dimensions-store-all", e)
}).then(() => process.exit(0))



function getYesterdayTimeS() {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yyyy = yesterday.getUTCFullYear();
  const mm = String(yesterday.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(yesterday.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayTimeS() {
  const today = new Date();
  const yyyy = today.getUTCFullYear();
  const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(today.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}