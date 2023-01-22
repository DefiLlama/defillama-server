import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { getCachedResponseOnR2 } from "../../utils/storeR2Response";
import { handler as process_handler, DEFAULT_CHART_BY_ADAPTOR_TYPE, getOverviewCachedResponseKey } from "../processProtocolsSummary";
import invokeLambda from "../../../utils/shared/invokeLambda";
import { AdaptorRecordTypeMap } from "../../db-utils/adaptor-record";

// -> /overview/{type}/{chain}
export const handler = async (event: AWSLambda.APIGatewayEvent, enableAlerts: boolean = false): Promise<IResponse> => {
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const rawDataType = event.queryStringParameters?.dataType
    const rawCategory = event.queryStringParameters?.category
    const category = rawCategory === 'dexs' ? 'dexes' : rawCategory
    const fullChart = event.queryStringParameters?.fullChart?.toLowerCase() === 'true'
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    const chainFilter = pathChain ? decodeURI(pathChain) : pathChain

    if (!adaptorType) throw new Error("Missing parameter")

    const response = await getCachedResponseOnR2(getOverviewCachedResponseKey(adaptorType, chainFilter, dataType, category, String(fullChart)))

    if (!response) {
        await invokeLambda("defillama-prod-processProtocolsSummary", event)
        const fallback_response = await process_handler(event, false)
        return successResponse(fallback_response, 3 * 60);
        //return successResponse({ message: "Response not yet available, please wait some minutes" }, 3 * 60);
    }

    if (excludeTotalDataChart)
        delete response.totalDataChart
    if (excludeTotalDataChartBreakdown)
        delete response.totalDataChartBreakdown
    if (!enableAlerts)
        delete response.errors

    return successResponse(response, 10 * 60); // 10 mins cache
};


export default wrap(handler);
