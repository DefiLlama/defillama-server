function getCondition(protocol: any, min: number, threshold: number) {
    return Number(protocol.total24h >= min) &&
            Number(protocol.change_1d) >= threshold * -1 &&
            Number(protocol.change_7d) >= threshold * -1 &&
            Number(protocol.change_1d) <= threshold &&
            Number(protocol.change_7d) <= threshold 
}

async function _getStaleProtocols() {
    const [fees,volume] = await Promise.all([
        fetch("https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true&dataType=dailyFees").then(response => response.json()).then(data => data.protocols),
        fetch("https://api.llama.fi/overview/dexs?excludeTotalDataChartBreakdown=true").then(response => response.json()).then(data => data.protocols),
    ])
    const responseTable : any = []
    fees.forEach((protocol: Record<string, any>) => {
        const threshold = protocol.category === "Lending" ? 1 : 3
        if (getCondition(protocol, 100, threshold))  {
            responseTable.push({
                metric: "Fees",
                protocol: protocol.name,
                total24h: protocol.total24h,
                change_1d: protocol.change_1d,
                change_7d: protocol.change_7d,
                total7DaysAgo: protocol.total7DaysAgo,
                total30DaysAgo: protocol.total30DaysAgo,
                methodologyURL: protocol.methodologyURL
            })
        }
    })
    volume.forEach((protocol: Record<string, any>) => {
        if (getCondition(protocol, 1000, 3))  {
            responseTable.push({
                metric: "Volume",
                protocol: protocol.name,
                total24h: protocol.total24h,
                change_1d: protocol.change_1d,
                change_7d: protocol.change_7d,
                total7DaysAgo: protocol.total7DaysAgo,
                total30DaysAgo: protocol.total30DaysAgo,
                methodologyURL: protocol.methodologyURL
            })
        }
    })
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