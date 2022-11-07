import "./setup.ts"
import { handler, IGetOverviewResponseBody } from "../handlers/getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";
import { formatTimestampAsDate } from "../../utils/date";
import { performance } from "perf_hooks";
import { handler as getDexs } from "../../dexVolumes/handlers/getDexs";

const event = {
    pathParameters: { chain: undefined, type: "dexs" },
    queryStringParameters: {
        excludeTotalDataChart: "true",
        // excludeTotalDataChartBreakdown: "true",
    }
} as unknown as APIGatewayProxyEvent

(async () => {
    var startTime = performance.now()
    const r = await handler(event)
    const u = await getDexs(event)
    var endTime = performance.now()
    const rr = JSON.parse(r.body) as IGetOverviewResponseBody
    const uu = JSON.parse(u.body)
    /*     // @ts-ignore
        delete rr.totalDataChartBreakdown
        delete rr.totalDataChart*/
    const a = rr.totalDataChartBreakdown.slice(-1)[0][0]
    const b = uu.totalDataChartBreakdown.slice(-1)[0][0]
    console.log(a, b)
/*     var result = a.filter(function (e) {
        let i = b.indexOf(e)
        return i == -1 ? true : (b.splice(i, 1), false)
    })
    console.log("result", result) */
    // console.log(rr.protocols.filter(p=>p.name.toLowerCase().includes('uniswap')).map(proto=>[proto.name, proto.totalAllTime]))
    console.log("Current run:", (endTime - startTime) / 1000)
    /* for (const [time, datapoint] of rr.totalDataChartBreakdown) {
        console.log(formatTimestampAsDate(time), datapoint)
    } */
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()