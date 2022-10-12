import "./setup.ts"
import { handler, IGetDexsResponseBody } from "../handlers/getDexs";
import { APIGatewayProxyEvent } from "aws-lambda";
import { formatTimestampAsDate } from "../../utils/date";

const event = {
    pathParameters: { chain: undefined, type: "volumes" }
} as unknown as APIGatewayProxyEvent

(async () => {
    const r = await handler(event)
    const rr = JSON.parse(r.body) as IGetDexsResponseBody
/* 
    for (const [time, datapoint] of rr.totalDataChartBreakdown) {
        console.log(formatTimestampAsDate(time), datapoint)
    } */
    /*     console.log("totalVolume", rr.totalVolume)
        console.log("changeVolume1d", rr.changeVolume1d)
        console.log("changeVolume7d", rr.changeVolume7d)
        console.log("changeVolume30d", rr.changeVolume30d) */
})()