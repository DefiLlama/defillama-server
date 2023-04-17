import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { getCachedResponseOnR2 } from "../../utils/storeR2Response";
import { handler as process_handler, DEFAULT_CHART_BY_ADAPTOR_TYPE, getOverviewCachedResponseKey, IGetOverviewResponseBody } from "../getOverviewProcess"
import invokeLambda from "../../../utils/shared/invokeLambda";
import { AdaptorRecordType, AdaptorRecordTypeMap } from "../../db-utils/adaptor-record";
import { CATEGORIES } from "../../data/helpers/categories";
import { getTimestampAtStartOfDay } from "@defillama/dimension-adapters/utils/date";

// -> /overview/{type}/{chain}
export const handler = async (event: AWSLambda.APIGatewayEvent & { dl_refresh?: boolean }, enableAlerts: boolean = false): Promise<IResponse> => {
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const rawDataType = event.queryStringParameters?.dataType
    const rawCategory = event.queryStringParameters?.category
    const category = (rawCategory === 'dexs' ? 'dexes' : rawCategory) as CATEGORIES
    const fullChart = event.queryStringParameters?.fullChart?.toLowerCase() === 'true'
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    const chainFilter = pathChain ? decodeURI(pathChain) : pathChain
    if (!adaptorType) throw new Error("Missing parameter")
    if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
    if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")
    if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")

    let response = await getCachedResponseOnR2<IGetOverviewResponseBody>(getOverviewCachedResponseKey(adaptorType, chainFilter, dataType, category, String(fullChart)))
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
    console.debug("Current vs lastModified timestamps", currentTiemstamp, response.lastModified.getTime())
    if (event.dl_refresh || (Math.trunc(currentTiemstamp) < getTimestampAtStartOfDay(Math.trunc(currentTiemstamp)) + 60 * 60 * 3)) {
        console.info("Response expired, invoking lambda to update it.")
        await invokeLambda("defillama-prod-getOverviewProcess", event)
    }

    if (excludeTotalDataChart)
        response.body.totalDataChart = []
    if (excludeTotalDataChartBreakdown)
        response.body.totalDataChartBreakdown = []
    if (!enableAlerts)
        delete response.body.errors

    return successResponse(response.body, 60 * 60); // 1h cache
};


export default wrap(handler);
