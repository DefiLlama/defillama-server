import { cache20MinResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { getProtocolGas, getProtocolTxs, getProtocolUsers, getProtocolNewUsers } from "./users/storeUsers";

const typeInfo = {
    users: {
        query: getProtocolUsers,
        column: "users"
    },
    txs: {
        query: getProtocolTxs,
        column: "sum"
    },
    gas: {
        query: getProtocolGas,
        column: "sum"
    },
    newusers: {
        query: getProtocolNewUsers,
        column: "users"
    },
} as {[type:string]: {query:typeof getProtocolUsers, column:string}}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolId = event.pathParameters?.protocolId?.toLowerCase().replace("$", "#");
    const type = event.pathParameters?.type?.toLowerCase();
    const selectedTypeInfo = typeInfo[type ?? '']
    if(selectedTypeInfo === undefined){
        return errorResponse({message: `Wrong type`})
    }
    const records = await selectedTypeInfo.query(protocolId ?? "none")
    return cache20MinResponse(records.map((d)=>([d.start, d[selectedTypeInfo.column]])))
}

export default wrap(handler);