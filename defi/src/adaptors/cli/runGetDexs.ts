import "./setup.ts"
import { handler, IGetOverviewResponseBody } from "../handlers/getOverview";
import { APIGatewayProxyEvent } from "aws-lambda";
import { formatTimestampAsDate } from "../../utils/date";

const event = {
    pathParameters: { chain: undefined, type: "fees" },
    queryStringParameters: {
        excludeTotalDataChart: "true",
        excludeTotalDataChartBreakdown: "true",
    }
} as unknown as APIGatewayProxyEvent

(async () => {
    const r = await handler(event)
    const rr = JSON.parse(r.body) as IGetOverviewResponseBody
    // @ts-ignore
    delete rr.totalDataChartBreakdown
    // @ts-ignore
    delete rr.totalDataChart
    console.log(rr)
    /* for (const [time, datapoint] of rr.totalDataChartBreakdown) {
        console.log(formatTimestampAsDate(time), datapoint)
    } */
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()