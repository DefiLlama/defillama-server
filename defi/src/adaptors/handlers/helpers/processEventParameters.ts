import { AdapterType } from "@defillama/dimension-adapters/adapters/types"
import { sluggifyString } from "../../../utils/sluggify"
import { CATEGORIES } from "../../data/helpers/categories"
import { normalizeDimensionChainsMap } from "../../utils/getAllChainsFromAdaptors"
import { AdaptorRecordType, AdaptorRecordTypeMap, DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../data/types"

const chainSlugKeyMap: Record<string, string> = {}
Object.keys(normalizeDimensionChainsMap).forEach((chainKey) => {
    const chainSlug  = sluggifyString(chainKey.toLowerCase())
    chainSlugKeyMap[chainSlug] = chainKey
})

export default (event: AWSLambda.APIGatewayEvent) => {
    const pathChain = event.pathParameters?.chain?.toLowerCase()
    const adaptorType = event.pathParameters?.type?.toLowerCase() as AdapterType
    const excludeTotalDataChart = event.queryStringParameters?.excludeTotalDataChart?.toLowerCase() === 'true'
    const excludeTotalDataChartBreakdown = event.queryStringParameters?.excludeTotalDataChartBreakdown?.toLowerCase() === 'true'
    const rawDataType = event.queryStringParameters?.dataType
    const rawCategory = event.queryStringParameters?.category
    const category = (rawCategory === 'dexs' ? 'dexs' : rawCategory) as CATEGORIES
    const fullChart = event.queryStringParameters?.fullChart?.toLowerCase() === 'true'
    const dataType = rawDataType ? AdaptorRecordTypeMap[rawDataType] : DEFAULT_CHART_BY_ADAPTOR_TYPE[adaptorType]
    const chainFilterRaw = (pathChain ? decodeURI(pathChain) : pathChain)?.toLowerCase()

    // if chain filter is passed, find relevant chain key from the slug
    const chainFilter = chainFilterRaw ? chainSlugKeyMap[chainFilterRaw] ?? chainFilterRaw : chainFilterRaw

    if (!adaptorType) throw new Error("Missing parameter")
    if (!Object.values(AdapterType).includes(adaptorType)) throw new Error(`Adaptor ${adaptorType} not supported`)
    if (category !== undefined && !Object.values(CATEGORIES).includes(category)) throw new Error("Category not supported")
    if (!Object.values(AdaptorRecordType).includes(dataType)) throw new Error("Data type not suported")
    return {
        adaptorType,
        excludeTotalDataChart,
        excludeTotalDataChartBreakdown,
        category,
        fullChart,
        dataType,
        chainFilter
    }
}