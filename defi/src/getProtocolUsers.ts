import { cache20MinResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import { getProtocolUsers } from "./users/storeUsers";

const typeInfo = {
    users: {
        table: "dailyUsers",
        column: "users"
    },
    txs: {
        table: "dailyTxs",
        column: "txs"
    },
    gas: {
        table: "dailyGas",
        column: "gasUsd"
    },
} as {[type:string]: {table:string, column:string}}

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
    const protocolId = event.pathParameters?.protocolId?.toLowerCase();
    const type = event.pathParameters?.type?.toLowerCase();
    const selectedTypeInfo = typeInfo[type ?? '']
    if(selectedTypeInfo === undefined){
        return errorResponse({message: `Wrong type`})
    }
    const records = await getProtocolUsers(protocolId ?? "none", selectedTypeInfo.table)
    return cache20MinResponse(records.map((d)=>([d.start, d[selectedTypeInfo.column]])))
}

export default wrap(handler);