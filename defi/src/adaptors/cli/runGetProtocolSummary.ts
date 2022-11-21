import "./setup.ts"
import { handler } from "../handlers/getProtocol";
import { performance } from "perf_hooks";

(async () => {
    const start = performance.now()
    const r = await handler({
        pathParameters: {
            name: "pancakeswap",
            type: "fees"
        },
        /* queryStringParameters: {
            dataType: "dailyRevenue"
        } */
    } as unknown as AWSLambda.APIGatewayEvent)
    const end = performance.now()
    const d = JSON.parse(r.body)
    console.log(d.totalDataChart.length)
    console.log(d.totalDataChartBreakdown.length)
    delete d['totalDataChart']
    delete d['totalDataChartBreakdown']
    console.log(d)
    console.log((end - start) / 1000)
    //console.log(JSON.stringify(d, null, 2))
})()