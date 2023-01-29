import "./setup.ts"
import { IGetOverviewEventParams, IGetOverviewResponseBody } from "../handlers/getOverviewProcess";
import { handler } from "../handlers/getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";
import { formatTimestampAsDate } from "../../utils/date";
import { performance } from "perf_hooks";

const event = {
    pathParameters: { chain: undefined, type: "dexs" },
    queryStringParameters: {
        excludeTotalDataChart: "false",
        excludeTotalDataChartBreakdown: "false"
    }
} as IGetOverviewEventParams

(async () => {
    var startTime = performance.now()
    const r = await handler(event as unknown as APIGatewayProxyEvent, false)
    var endTime = performance.now()
    const rr = JSON.parse(r.body) as IGetOverviewResponseBody
    // console.log(rr.protocols.filter(p=>p.name.toLowerCase().includes('jupiter')))
    // console.log(JSON.stringify(rr.protocols))
    // console.log("rr.totalDataChartBreakdown->", rr.totalDataChartBreakdown.slice(-1))
    // console.log("length", rr.protocols.length)
    // @ts-ignore
    // delete rr.protocols
    // console.log(rr.allChains)
    // console.log("rr.totalDataChart", rr.totalDataChart.find(d => +d[0] === Date.UTC(2021, 11, 15) / 1000))
    // console.log("rr.totalDataChartBreakdown", rr.totalDataChartBreakdown.find(d => +d[0] === Date.UTC(2021, 11, 15) / 1000))
    // console.log(rr.protocols.filter(name=>name.name.toLowerCase().includes("uniswap") || name.name.toLowerCase().includes("pancakeswap")))
    // console.log(rr.protocols[0])
    console.log(rr.totalDataChart.length)
    const runTime = (endTime - startTime) / 1000
    const runTimeDescription = runTime > 30 ? '🐢' : '🐇'
    console.log(`\nCurrent run ${runTimeDescription} (s): ${runTime}`)
    /* for (const [time, datapoint] of rr.totalDataChartBreakdown) {
        console.log(formatTimestampAsDate(time), datapoint)
    } */
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()