import { successResponse, wrap, IResponse } from "./utils/shared";
import fetch from "node-fetch";

const chain2url = {
  ethereum: "etherscan.io",
  polygon: "polygonscan.com",
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = event.pathParameters?.chain?.toLowerCase();
  const contract = event.pathParameters?.contract?.toLowerCase();
  const name = await fetch(`https://api.${chain2url[chain]}/api?module=contract&action=getsourcecode&address=${contract}&apikey=YourApiKeyToken`).then(r=>r.json())
  return successResponse({
    name: name.result[0].ContractName
  }, 3* 60 * 60); // 3h
};

export default wrap(handler);