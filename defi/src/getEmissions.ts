import {
  wrap,
  IResponse,
  errorResponse,
  successResponse,
} from "./utils/shared";
import fs from "fs";

const handler = async (event: any): Promise<IResponse> => {
  const protocolName: string = event.pathParameters?.protocol?.toLowerCase();
  try {
    const data = JSON.parse(
      fs.readFileSync(`defi/src/emissions/charts/${protocolName}.json`, "utf8"),
    );
    return successResponse({ data });
  } catch {
    return errorResponse({
      message: `protocol '${protocolName}' has no chart to fetch`,
    });
  }
};

export default wrap(handler);
