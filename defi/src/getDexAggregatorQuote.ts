import { allDexAggregators } from "./dexAggregators";
import { wrap, IResponse, errorResponse, successResponse } from "./utils/shared";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const {protocol, chain, from, to, amount} = event.queryStringParameters!;
    const agg = allDexAggregators.find(ag=>ag.name===protocol)
    if(agg === undefined){
        return errorResponse({message: "No DEX Aggregator with that name"})
    }
    const quote = await agg.getQuote(chain!, from!, to!, amount!)
    return successResponse(quote, 10)
};

export default wrap(handler);