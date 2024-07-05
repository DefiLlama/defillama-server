import '../../../api2/utils/failOnError'

import { handler2 } from ".";
import { ADAPTER_TYPES } from "../triggerStoreAdaptorData";
import { AdapterType } from '@defillama/dimension-adapters/adapters/types';
import { getUnixTimeNow } from '../../../api2/utils/time';
import { elastic } from '@defillama/sdk';

async function run() {
  const startTimeAll = getUnixTimeNow()
  console.time("**** Run All Adaptor types")

  const randomizedAdapterTypes = [...ADAPTER_TYPES].sort(() => Math.random() - 0.5)
  for (const adapterType of randomizedAdapterTypes) {
    await runAdapterType(adapterType)
  }

  async function runAdapterType(adapterType: AdapterType) {
    const startTimeCategory = getUnixTimeNow()
    // if (adapterType !== AdapterType.OPTIONS) return;
    const key = "**** Run Adaptor type: " + adapterType
    console.time(key)
    let success = false

    try {

      await handler2({ adapterType })

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

run().catch(console.error).then(() => process.exit(0))

// catch unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Dimensions runner: Unhandled Rejection at:', reason, 'promise:', promise);
  process.exit(1)
});

process.on('uncaughtException', (error) => {
  console.error('Dimensions runner: Uncaught Exception thrown', error);
  process.exit(1)
})

setTimeout(() => {
  console.error("Timeout reached, exiting from dimensions-store-all...")
  process.exit(1)
}, 1000 * 60 * 90) // 45 minutes