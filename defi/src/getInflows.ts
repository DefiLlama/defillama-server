import { wrap, IResponse, successResponse, errorResponse } from "./utils/shared";
import protocols from "./protocols/data";
import sluggify from "./utils/sluggify";
import getTVLOfRecordClosestToTimestamp from "./utils/shared/getRecordClosestToTimestamp";
import { getLastRecord, hourlyTokensTvl, hourlyUsdTokensTvl } from "./utils/getLastRecord";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    const protocolName = event.pathParameters?.protocol?.toLowerCase()
    const timestamp = Number(event.pathParameters?.timestamp)
    const protocolData = protocols.find(
        (prot) => sluggify(prot) === protocolName
      );
    
    const old = await getTVLOfRecordClosestToTimestamp(hourlyTokensTvl(protocolData?.id!), timestamp, 2*3600)
    if(old.SK === undefined){
        return errorResponse({message: "No data at that timestamp"})
    }
    const [currentTokens, currentUsdTokens] = await Promise.all([hourlyTokensTvl, hourlyUsdTokensTvl].map(prefix=>
        getLastRecord(prefix(protocolData?.id!))
    ))

    let outflows = 0;
    Object.entries(currentTokens!.tvl).forEach(([token, amountRaw])=>{
        const amount = amountRaw as number;
        const diff = amount - (old.tvl[token] ?? 0);
        const price = currentUsdTokens!.tvl[token]/amount;
        outflows += diff*price;
    })
    return successResponse({outflows});
};

export default wrap(handler);
