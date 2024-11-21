import { successResponse, wrap, IResponse, errorResponse } from "./utils/shared";
import protocols, { Protocol} from "./protocols/data";
import { getLastRecord, hourlyUsdTokensTvl } from "./utils/getLastRecord";
import { importAdapter } from "./utils/imports/importAdapter";

async function _protocolHasMisrepresentedTokens(protocol: Protocol){
  const module = await importAdapter(protocol);
  return module.misrepresentedTokens
}

async function _getLastHourlyTokensUsd(protocol: Protocol){
  return getLastRecord(hourlyUsdTokensTvl(protocol.id))
}

export async function getTokensInProtocolsInternal(symbol: string, {
  protocolList = protocols,
  getLastHourlyTokensUsd = _getLastHourlyTokensUsd,
  protocolHasMisrepresentedTokens = _protocolHasMisrepresentedTokens
} = {}){
  return (await Promise.all(
    protocolList.map(async (protocol) => {
      const [lastTvl, misrepresentedTokens] = await Promise.all([
        getLastHourlyTokensUsd(protocol),
        protocolHasMisrepresentedTokens(protocol),
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
          misrepresentedTokens,
      }
    })
  )).filter(r=>r !== null)
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const symbol = decodeURI(event.pathParameters?.symbol?.toUpperCase() ?? "");
  if(symbol === ""){
    return errorResponse({message: "Ser you need to provide a token"})
  }
  const protocolsIncluded = await getTokensInProtocolsInternal(symbol)
  return successResponse(protocolsIncluded, 20 * 60); // 10 mins cache
};

export default wrap(handler);
