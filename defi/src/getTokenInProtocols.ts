import { successResponse, wrap, IResponse } from "./utils/shared";
import protocols from "./protocols/data";
import { getLastRecord, hourlyUsdTokensTvl } from "./utils/getLastRecord";
import { importAdapter } from "./utils/imports/importAdapter";

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const symbol = decodeURI(event.pathParameters?.symbol ?? "");
  const protocolsIncluded = await Promise.all(
    protocols.map(async (protocol) => {
      const [lastTvl, module] = await Promise.all([
        getLastRecord(hourlyUsdTokensTvl(protocol.id)),
        importAdapter(protocol),
      ]);
      const amountUsd = lastTvl?.tvl?.[symbol]
      if(amountUsd === undefined){
        return null
      } else {
        return {
            name: protocol.name,
            amountUsd,
            misrepresentedTokens: module.misrepresentedTokens
        }
      }
    })
  )
  return successResponse(protocolsIncluded, 10 * 60); // 10 mins cache
};

export default wrap(handler);
