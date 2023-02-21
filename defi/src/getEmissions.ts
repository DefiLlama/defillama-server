import {
  wrap,
  IResponse,
  errorResponse,
  successResponse,
} from "./utils/shared";
import { createChartData } from "./emissions/utils/convertToChartData";
import { createRawSections } from "./emissions/utils/convertToRawData";
import adapters from "./emissions/protocols";
import { ChartSection, Protocol } from "./emissions/types/adapters";

const handler = async (event: any): Promise<IResponse> => {
  const protocolName: string = event.pathParameters?.protocol?.toLowerCase();
  const adapter: Protocol = (adapters as any)[protocolName];
  if (!adapter) {
    return errorResponse({
      message: `The passed protocol name is invalid. Make sure '${adapter}' is a key of './emissions/protocols/index.ts`,
    });
  }
  const { rawSections, startTime, endTime } = await createRawSections(adapter);
  const data = createChartData(rawSections, startTime, endTime, false).map(
    (s: ChartSection) => ({
      label: s.section,
      data: s.data.apiData,
    }),
  );
  return successResponse({ data });
};

export default wrap(handler);

async function main() {
  let a = await handler({ pathParameters: { protocol: "apecoin" } });
  return;
}

main(); // ts-node src/getEmissions.ts
