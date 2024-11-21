import '../../api2/utils/failOnError'

import { ADAPTER_TYPES } from "./triggerStoreAdaptorData";
import { sendDiscordAlert } from "../utils/notify";
import loadAdaptorsData from "../data"
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import axios from 'axios'

setTimeout(() => {
  console.error("Timeout reached, exiting from dimensions: notify & backfill ...")
  process.exit(1)
}, 1000 * 60 * 60 * 2) // 1 hours

export const handler = async () => {
  try {
    console.info("Starting notifyAdapterStatus...")
    await Promise.all(ADAPTER_TYPES.map((adaptorType: AdapterType) => notifyAdapterStatus({ adaptorType })))
  } catch (e) {
    console.error("Error in notifyAdapterStatus", e)
  }
};
console.info("Hello from notifyAdapterStatus");
(async () => {
  try {
    await handler();
  } catch (e) {
    console.error("Error in notifyAdapterStatus", e)
  }
  process.exit(0)
})();

const DISCORD_USER_0xgnek_ID = '<@!736594617918554182>'

async function notifyAdapterStatus({ adaptorType }: { adaptorType: AdapterType }) {
  if (adaptorType === AdapterType.PROTOCOLS) {
    console.log("skipping protocols")
    return;
  }

  const { data: parsedBody } = await axios.get('https://api.llama.fi/overview/' + adaptorType)

  const returnedProtocols = new Set(parsedBody.protocols.map((p: any) => p.module))
  const protocolsList = Object.entries((await loadAdaptorsData(adaptorType as AdapterType)).config).filter(([_key, config]) => config.enabled).map(m => m[0])
  let notIncluded = []
  for (const prot of protocolsList)
    if (!returnedProtocols.has(prot))
      notIncluded.push(prot)
  let zeroValueProtocols = []
  let notUpdatedProtocols = []
  const currenntData = parsedBody.totalDataChartBreakdown?.slice(-1)[0][1] ?? {}
  const prevData = parsedBody.totalDataChartBreakdown?.slice(-2)[0][1] ?? {}

  for (const [key, value] of Object.entries(currenntData)) {
    if (value === 0) zeroValueProtocols.push(key)
    if ((currenntData[key] === prevData[key]) && value !== 0) notUpdatedProtocols.push(key)
  }

  // console.log(adaptorType, "zeroValueProtocols", zeroValueProtocols.length, zeroValueProtocols)
  // console.log(adaptorType, "notIncluded", notIncluded.length, notIncluded)

  if (notIncluded.length > 0) {
    await sendDiscordAlert(`[${adaptorType}] The following protocols haven't been included in the response: ${notIncluded.join(", ")}`, adaptorType)
    await sendDiscordAlert(`[${adaptorType}] ${notIncluded.length} protocols haven't been included in the response ${notIncluded.length > 2 ? DISCORD_USER_0xgnek_ID : ''}`, adaptorType, false)
  }
  else
    await sendDiscordAlert(`[${adaptorType}] All protocols have been ranked`, adaptorType, false)
  zeroValueProtocols = [...new Set(zeroValueProtocols)]
  notUpdatedProtocols = [...new Set(notUpdatedProtocols)]
  const hasZeroValues = zeroValueProtocols.length > 0
  const hasNotUpdatedValues = notUpdatedProtocols.length > 0
  if (hasZeroValues || hasNotUpdatedValues) {
    if (hasNotUpdatedValues)
      await sendDiscordAlert(`${notUpdatedProtocols.length} adapters haven't been updated since the last check... [${notUpdatedProtocols.join(', ')}]`, adaptorType)
    if (hasZeroValues)
      await sendDiscordAlert(`${zeroValueProtocols.length} adapters report 0 value dimension...Will retry later...[${zeroValueProtocols.join(', ')}]`, adaptorType)
  }
  else
    await sendDiscordAlert(`[${adaptorType}] Looks like all good`, adaptorType)
}
