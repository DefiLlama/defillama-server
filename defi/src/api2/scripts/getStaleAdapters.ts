const metrics = [
  { name: "Fees", endpoint: "https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=false&dataType=dailyFees", minValue: 100 },
  { name: "Revenue", endpoint: "https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=false&dataType=dailyRevenue", minValue: 50 },
  { name: "Aggregator Volume", endpoint: "https://api.llama.fi/overview/aggregators?excludeTotalDataChartBreakdown=false", minValue: 1000 },
  { name: "Bridge Aggregator Volume", endpoint: "https://api.llama.fi/overview/bridge-aggregators?excludeTotalDataChartBreakdown=false", minValue: 1000 },
  { name: "DEX Volume", endpoint: "https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=false", minValue: 1000 },
  { name: "Options Notional Volume", endpoint: "https://api.llama.fi/overview/options?excludeTotalDataChartBreakdown=false", minValue: 1000 },
  { name: "Options Premium Volume", endpoint: "https://api.llama.fi/overview/options?excludeTotalDataChartBreakdown=false&dataType=dailyPremiumVolume", minValue: 1000 },
  { name: "Derivatives", endpoint: "https://api.llama.fi/overview/derivatives?excludeTotalDataChartBreakdown=false", minValue: 1000 },
  { name: "Aggregator Derivatives", endpoint: "https://api.llama.fi/overview/aggregator-derivatives?excludeTotalDataChartBreakdown=false", minValue: 1000 }
]

function formatResponse(response: any) {
  const twoWeeks = 60000 * 60 * 24 * 14
  const twoWeeksAgo = (Number(new Date()) - twoWeeks) / 1000
  const protocols = response.protocols
  const chartData = response.totalDataChartBreakdown.filter((row: any[]) => row[0] >= twoWeeksAgo)
  return [protocols, chartData]
}

async function _getStaleProtocols() {
  function calculateChange(chartDataset: number[], protocol: any, min: number, threshold: number, metric: String) {
    if (Number(protocol.total24h) < min) {
      return null
    }
    const thresholdMin = threshold * - 1
    const chartData = chartDataset.map((row: any) => row[1][protocol.name])
    const max14d = Math.max(...chartData)
    const min14d = Math.min(...chartData)
    const change = (max14d / min14d) - 1
    if (change >= thresholdMin && change <= threshold) {
      responseTable.push({
        metric: metric,
        protocol: protocol.name,
        total24h: protocol.total24h,
        change: +(change * 100).toFixed(2),
        max_14d: max14d,
        min_14d: min14d,
        methodologyURL: protocol.methodologyURL
      })
    }
  }

  const responseTable: any = []
  await Promise.all(metrics.map(async (metric) => {
    const data = await fetch(metric.endpoint).then(response => response.json())
    const [protocols, chartData] = formatResponse(data)
    protocols.forEach((protocol: Record<string, any>) => {
      const threshold = (metric.name === "Fees" && protocol.category === "Lending") ? 0.01 : 0.03
      calculateChange(chartData, protocol, metric.minValue, threshold, metric.name)
    })
  }))
    return responseTable
}

export async function getStaleProtocols() {
    const data = await _getStaleProtocols()
    return data
}

if (!process.env.IS_NOT_SCRIPT_MODE)
  getStaleProtocols().then(console.table).catch(console.error).then(() => {
    console.log("Done");
    process.exit(0);
  })
