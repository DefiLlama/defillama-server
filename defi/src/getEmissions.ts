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
  } catch (e) {
    if (
      typeof e == "object" &&
      e != null &&
      "message" in e &&
      typeof e.message == "string"
    )
      return errorResponse({
        message: `protocol '${protocolName}' has no chart to fetch: ${e.message}`,
      });
    return errorResponse({
      message: `protocol '${protocolName}' has no chart to fetch and no error message could be returned`,
    });
  }
};

export default wrap(handler);

// async function main() {
//   let a = await handler({ pathParameters: { protocol: "ave" } });
//   return;
// }
// main(); // ts-node defi/src/getEmissions.ts
