import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import protocols from "./protocols/data";
import { getLastRecord, hourlyUsdTokensTvl } from "./utils/getLastRecord";
import { importAdapter } from "./utils/imports/importAdapter";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const symbol = decodeURI(event.pathParameters?.symbol?.toUpperCase() ?? "");
  if(symbol === ""){
    return errorResponse({message: "Ser you need to provide a token"})
  }
  const protocolsIncluded = (await Promise.all(
    protocols.map(async (protocol) => {
      const [lastTvl, module] = await Promise.all([
        getLastRecord(hourlyUsdTokensTvl(protocol.id)),
        importAdapter(protocol),
      ]);
      if(typeof lastTvl?.tvl !== "object"){
        return null
      }
      const amountUsd = {} as any
      let matches = 0
      Object.entries(lastTvl.tvl).forEach(([s, v])=>{
        if(s.includes(symbol)){
          amountUsd[s] = v;
          matches++;
        }
      })
      if(matches === 0){
        return null
      }
      return {
          name: protocol.name,
          category: protocol.category,
          amountUsd,
          misrepresentedTokens: module.misrepresentedTokens
      }
    })
  )).filter(r=>r !== null)
  return successResponse(protocolsIncluded, 20 * 60); // 10 mins cache
};

export default wrap(handler);
