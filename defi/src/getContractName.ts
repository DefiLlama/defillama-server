import { successResponse, wrap, IResponse } from "./utils/shared";
import fetch from "node-fetch";

const chain2url: { [chain: string]: string } = {
  ethereum: "etherscan.io",
  polygon: "polygonscan.com",
}

export async function getContractNameInternal(chain: string | undefined, contract: string | undefined) {
  if (!chain || !contract) return ''
  chain = chain.toLowerCase();
  contract = contract.toLowerCase();
  if (!chain2url[chain]) throw new Error(`Unsupported chain ${chain}`)
  const name = await fetch(`https://api.${chain2url[chain]}/api?module=contract&action=getsourcecode&address=${contract}&apikey=YourApiKeyToken`).then(r => r.json())
  return name.result[0].ContractName
}

const handler = async (
  event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
  const chain = event.pathParameters?.chain;
  const contract = event.pathParameters?.contract;
  const name = await getContractNameInternal(chain, contract);
  return successResponse({ name }, 3 * 60 * 60); // 3h
};

export default wrap(handler);