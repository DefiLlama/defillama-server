import { wrap, IResponse, errorResponse } from "./utils/shared";
import { wrapResponseOrRedirect } from "./getProtocol";
import craftProtocol from "./utils/craftProtocol";
import { treasuries } from "./protocols/data";
import sluggify from "./utils/sluggify";
import parentProtocols from "./protocols/parentProtocols";
import craftParentProtocol from "./utils/craftParentProtocol";

const handler = async (event: AWSLambda.APIGatewayEvent): Promise<IResponse> => {
  const protocolName = event.pathParameters?.protocol?.toLowerCase() + "-(treasury)";
  const protocolData = treasuries.find((prot) => sluggify(prot) === protocolName);

  if (!protocolData && event?.pathParameters?.protocol) {
    console.log(event.pathParameters!.protocol);
    const parentProtocolId = treasuries
      .filter((prot) => prot.parentProtocol)
      .find(
        (prot) => prot.parentProtocol === "parent#" + event.pathParameters!.protocol!.toLowerCase()
      )?.parentProtocol;

    const parentProtocol = parentProtocols.find((protocol) => protocol.id === parentProtocolId);

    if (!parentProtocol) {
      return errorResponse({
        message: "Protocol is not in our database",
      });
    }

    console.log({ parentProtocol });

    const response = await craftParentProtocol({
      parentProtocol,
      useHourlyData: false,
      skipAggregatedTvl: true,
      isTreasuryApi: true,
    });

    return wrapResponseOrRedirect(response);
  }

  if (!protocolData) {
    return errorResponse({
      message: "Protocol is not in our database",
    });
  }

  const response = await craftProtocol({
    protocolData,
    useNewChainNames: true,
    useHourlyData: false,
    skipAggregatedTvl: true,
  });

  return wrapResponseOrRedirect(response);
};

export default wrap(handler);
