import { createChartData } from "./emissions/utils/convertToChartData";
import { createRawSections } from "./emissions/utils/convertToRawData";
import adapters from "./emissions/protocols";
import { ChartSection, Protocol } from "./emissions/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { wrapScheduledLambda } from "./utils/shared/wrap";

async function handler() {
    await Promise.all(Object.keys(adapters).map(async protocolName => {
        const adapter: Protocol = (adapters as any)[protocolName];
        const { rawSections, startTime, endTime, metadata } = await createRawSections(adapter);
        const chart = createChartData(rawSections, startTime, endTime, false).map(
            (s: ChartSection) => ({
                label: s.section,
                data: s.data.apiData,
            }),
        );
        const data = { data: chart, metadata };
        await storeR2JSONString(`emissions/${protocolName}`, JSON.stringify(data), 3600)
    }))
}

export default wrapScheduledLambda(handler);