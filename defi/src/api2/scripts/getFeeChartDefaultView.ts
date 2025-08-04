import loadAdaptorsData from "../../adaptors/data";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { getAllItemsAfter } from "../../adaptors/db-utils/db2";
import { sliceIntoChunks } from "@defillama/sdk/build/util";
import { protocolsById } from "../../protocols/data";


let data: any

export async function getFeeChartDefaultView() {
  if (!data) data = _call()
  return data;
}

async function _call() {
  const fourMonthsAgo = Math.floor(Date.now() / 1000) - 4 * 30 * 24 * 60 * 60
  const allData: any = await getAllItemsAfter({ adapterType: AdapterType.FEES, timestamp: fourMonthsAgo })
  console.log('fetched records length:', allData.length)
  const protocols: any = {}
  allData.forEach((item: any) => {
    if (!protocols[item.id]) protocols[item.id] = { records: [], dfTotal: 0, drTotal: 0 }
    protocols[item.id].records.push(item)
    protocols[item.id].dfTotal += item.data.aggregated?.df?.value || 0
    protocols[item.id].drTotal += item.data.aggregated?.dr?.value || 0
  })

  const { protocolAdaptors } = await loadAdaptorsData(AdapterType.FEES)
  const removeProtocol = (id: string) => delete protocols[id]
  // ignore protocols for which we already hav set default view, total fees/revenue less than 10k
  Object.keys(protocols).forEach((id: any) => {
    if (protocols[id].dfTotal < 10000 && protocols[id].drTotal < 10000)
      return removeProtocol(id)
    if (!protocolAdaptors[id])
      return removeProtocol(id)
    const { defaultChartView } = protocolAdaptors[id]
    if (defaultChartView) return removeProtocol(id)
  })


  const results: any = []
  Object.entries(protocols).forEach(([id, { records, dfTotal, drTotal }]: any) => {
    const weeklyBatches = sliceIntoChunks(records, 7)
    const monthlyBatches = sliceIntoChunks(records, 30)

    const isWeekly = weeklyBatches.map(isHighest4xMedian).filter(Boolean).length > 7
    const isMonthly = monthlyBatches.map(isHighest4xMedian).filter(Boolean).length >= 2

    if (isWeekly || isMonthly) {
      const { name, category } = protocolsById[id] || {}
      results.push({ id, name, category, isWeekly, isMonthly, dfTotal, drTotal })
    }

    function isHighest4xMedian(arr: number[]): boolean | false {
      if (!Array.isArray(arr) || arr.length < 7) return false;
      const valField = dfTotal > drTotal ? 'df' : 'dr'
      const getValue = (record: any) => record.data.aggregated[valField]?.value || 0

      arr = arr.map(getValue)
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
      const thirdHighest = sorted[sorted.length - 3];
      const highest = sorted[sorted.length - 1];
      return highest >= 4 * median && highest >= 3 * thirdHighest;
    }
  })
  return results

}

if (!process.env.IS_NOT_SCRIPT_MODE)
  getFeeChartDefaultView().then(console.table).catch(console.error).then(() => {
    console.log("Done");
    process.exit(0);
  })