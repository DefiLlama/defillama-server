import { successResponse, wrap, IResponse } from "../../../utils/shared";
import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import { getCachedResponseOnR2 } from "../../utils/storeR2Response";
import { handler as process_handler, DEFAULT_CHART_BY_ADAPTOR_TYPE, getOverviewCachedResponseKey, IGetOverviewResponseBody } from "../processProtocolsSummary";
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

    const response = await getCachedResponseOnR2<IGetOverviewResponseBody>(getOverviewCachedResponseKey(adaptorType, chainFilter, dataType, category, String(fullChart)))

    if (!response) {
        await invokeLambda("defillama-prod-processProtocolsSummary", event)
        return successResponse({ message: "Response not yet available, please await some minutes" }, 3 * 60);
    }

    if ((Date.now() - response.lastModified.getTime()) > 1000 * 60 * 60)
        await invokeLambda("defillama-prod-processProtocolsSummary", event)

    if (excludeTotalDataChart)
        delete response.body.totalDataChart
    if (excludeTotalDataChartBreakdown)
        delete response.body.totalDataChartBreakdown
    if (!enableAlerts)
        delete response.body.errors

    return successResponse(response.body, 60 * 60); // 1h cache
};


export default wrap(handler);
