async function _getStaleProtocols() {
    const response = await fetch("https://api.llama.fi/overview/fees?excludeTotalDataChartBreakdown=true")
    const data = await response.json()
    const protocols = data.protocols
    const responseTable : any = []
    protocols.forEach((protocol: Record<string, any>) => {
        if (Number(protocol.total24h === Number(protocol.total7DaysAgo)) && Number(protocol.total24h === Number(protocol.total30DaysAgo))) {
            responseTable.push({
                protocol: protocol.name,
                total24h: protocol.total24h,
                total7DaysAgo: protocol.total7DaysAgo,
                total30DaysAgo: protocol.total30DaysAgo,
                totalAllTime: protocol.totalAllTime,
                average1y: protocol.average1y,
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