import {
  wrap,
  IResponse,
  errorResponse,
  successResponse,
} from "./utils/shared";
import fs from "fs";
import path from "path";

const handler = async (event: any): Promise<IResponse> => {
  const protocolName: string = event.pathParameters?.protocol?.toLowerCase();

  try {
    const data = JSON.parse(
      fs.readFileSync(
        path.join(__dirname, `./emissions/charts/${protocolName}.json`),
        "utf8",
      ),
    );
    return successResponse(data);
  } catch {
    return errorResponse({
      message: `protocol '${protocolName}' has no chart to fetch`,
    });
  }
};

export default wrap(handler);

// async function main() {
//   let a = await handler({ pathParameters: { protocol: "aave" } });
//   return;
// }
// main(); // ts-node defi/src/getEmissions.ts
