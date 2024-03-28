import '../../../api2/utils/failOnError'

import { handler2 } from ".";
import { ADAPTER_TYPES } from "../triggerStoreAdaptorData";

async function run() {
  console.time("**** Run All Adaptor types")
  await Promise.all(ADAPTER_TYPES.map(async (adapterType) => {
    const key = "**** Run Adaptor type: " + adapterType
    console.time(key)
    try {
      await handler2({ adapterType })
    } catch (e) {
      console.error("error", e)
    }
    console.timeEnd(key)
  }))
  console.timeEnd("**** Run All Adaptor types")
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
}, 1000 * 60 * 60 * 2) // 2 hours