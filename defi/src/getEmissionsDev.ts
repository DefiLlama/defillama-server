import {
  wrap,
  IResponse,
  notFoundResponse,
  successResponse,
} from "./utils/shared";
import * as charts from "./emissions/charts";
const handler = async (event: any): Promise<IResponse> => {
  const protocolName: string = event.pathParameters?.protocol?.toLowerCase();

  try {
    //const data = await import(`./emissions/charts/${protocolName}.json`);
    const data = charts.default[protocolName as keyof typeof charts.default];
    return successResponse(data);
  } catch (e) {
    return notFoundResponse({
      message: `protocol '${protocolName}' has no chart to fetch`,
    });
  }
};

export default wrap(handler);

async function main() {
  let a = await handler({ pathParameters: { protocol: "aave" } });
  return;
}
main(); // ts-node defi/src/getEmissionsDev.ts
