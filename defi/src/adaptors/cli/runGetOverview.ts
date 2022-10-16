import "./setup.ts"
import { handler, IGetOverviewResponseBody } from "../handlers/getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";
import { formatTimestampAsDate } from "../../utils/date";
import { performance } from "perf_hooks";

const event = {
    pathParameters: { chain: undefined, type: "volumes" },
    queryStringParameters: {
        excludeTotalDataChart: "true",
        excludeTotalDataChartBreakdown: "true",
        dataType: "totalVolume",
    }
} as unknown as APIGatewayProxyEvent

(async () => {
    var startTime = performance.now()
    const r = await handler(event)
    var endTime = performance.now()
    const rr = JSON.parse(r.body) as IGetOverviewResponseBody
    /*     // @ts-ignore
        delete rr.totalDataChartBreakdown
        // @ts-ignore
        delete rr.totalDataChart*/
    console.log(rr.protocols)
    console.log(endTime - startTime)
    /* for (const [time, datapoint] of rr.totalDataChartBreakdown) {
        console.log(formatTimestampAsDate(time), datapoint)
    } */
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()