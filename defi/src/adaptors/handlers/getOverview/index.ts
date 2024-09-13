import { successResponse, wrap, IResponse, dayCache } from "../../../utils/shared";
import { getCachedResponseOnR2 } from "../../utils/storeR2Response";
import { handler as process_handler, getOverviewCachedResponseKey, IGetOverviewResponseBody } from "../getOverviewProcess"
import invokeLambda from "../../../utils/shared/invokeLambda";
import { getTimestampAtStartOfDay } from "@defillama/dimension-adapters/utils/date";
import processEventParameters from "../helpers/processEventParameters";
import { wrapResponseOrRedirect } from "../../../getProtocol";

// -> /overview/{type}/{chain}
export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    const {
        adaptorType,
        excludeTotalDataChart,
        excludeTotalDataChartBreakdown,
        category,
        fullChart,
        dataType,
        chainFilter
    } = processEventParameters(event)

    const cacheKey = getOverviewCachedResponseKey(adaptorType, chainFilter, dataType, category, String(fullChart))
    let response = await getCachedResponseOnR2<IGetOverviewResponseBody>(cacheKey)
        .catch(e => console.error("Unable to retrieve cached response...", e))

    delete event.queryStringParameters?.excludeTotalDataChart
    delete event.queryStringParameters?.excludeTotalDataChartBreakdown
    if (!response) {
        console.info("Response not found, generating...")
        response = {
            body: JSON.parse((await process_handler(event)).body),
            lastModified: new Date(2023, 0, 29) // past date to trigger invokeLambda
        }
    }

    const currentTiemstamp = Date.now()
    console.debug("lastModified", currentTiemstamp, response.lastModified.getTime())
    if ((currentTiemstamp - response.lastModified.getTime()) > 60 * 60 * 1000 || (Math.trunc(currentTiemstamp) < getTimestampAtStartOfDay(Math.trunc(currentTiemstamp)) + 60 * 60 * 3)) {
        console.info("Response expired, invoking lambda to update it.")
        await invokeLambda("defillama-prod-getOverviewProcess", event)
    }

    if (excludeTotalDataChart)
        response.body.totalDataChart = []
    if (excludeTotalDataChartBreakdown)
        response.body.totalDataChartBreakdown = []
    if (!enableAlerts)
        delete response.body.errors

    if(chainFilter === undefined && adaptorType === "fees" && response.body.protocols.length < 10){
        throw new Error("Too few protocols")
    }

    return wrapResponseOrRedirect(response.body, `dimensions/${cacheKey}`);
};


export default wrap(handler);
