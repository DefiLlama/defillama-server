import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import * as fs from "fs";
import * as path from "path";
import loadAdaptorsData from "../../adaptors/data";
import { AdaptorData } from "../../adaptors/data/types";
import { getAllItemsAfter } from "../../adaptors/db-utils/db2";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../adaptors/handlers/getOverviewProcess";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";

const outputDir = path.join(__dirname, "reports");
const january1st2023Timestamp = Date.UTC(2023, 0, 1) / 1000;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const initCsvFile = (adapterType: string, dayType: "missing" | "negative") => {
  const filePath = path.join(outputDir, `${adapterType}_${dayType}_days_report.csv`);
  const csvHeader = "Protocol Name, Timestamps, Adapter Type, Backfill Command\n";
  fs.writeFileSync(filePath, csvHeader);
  return filePath;
};

const filePaths: Record<string, { missing: string; negative: string }> = {};
ADAPTER_TYPES.forEach((adapterType) => {
  filePaths[adapterType] = {
    missing: initCsvFile(adapterType, "missing"),
    negative: initCsvFile(adapterType, "negative"),
  };
});

async function run() {
  const allCache: Record<string, any> = {};

  await Promise.all(
    ADAPTER_TYPES.map(async (adapterType) => {
      await fetchData(adapterType);
      await generateSummaries(adapterType);
    })
  );

  await cleanupEmptyCsvFiles();

  async function fetchData(adapterType: AdapterType) {
    if (!allCache[adapterType]) allCache[adapterType] = { protocols: {} };
    const adapterData = allCache[adapterType];

    const results = await getAllItemsAfter({ adapterType, timestamp: 0 });
    const recordType = DEFAULT_CHART_BY_ADAPTOR_TYPE[adapterType];
    if (!recordType) return;

    results.forEach((result: any) => {
      const { id, timestamp, data, timeS } = result;
      const aggData = data?.aggregated?.[recordType]?.value;

      if (!adapterData.protocols[id] && aggData && aggData > 0) {
        adapterData.protocols[id] = { records: {}, firstDate: timeS };
      }

      if (adapterData.protocols[id]) {
        adapterData.protocols[id].records[timeS] = { ...data, timestamp };
        adapterData.protocols[id].recordCount = Object.keys(adapterData.protocols[id].records).length;
      }
    });
  }

  async function generateSummaries(adapterType: AdapterType) {
    const recordType = DEFAULT_CHART_BY_ADAPTOR_TYPE[adapterType];
    if (!recordType) return;

    const dataModule = loadAdaptorsData(adapterType);
    let { protocolMap: dimensionProtocolMap } = dataModule;
    const adapterData = allCache[adapterType];

    for (const protocolInfo of Object.values(dimensionProtocolMap) as any) {
      if (protocolInfo.enabled === false || protocolInfo.disabled) {
        console.log(`Excluding disabled adapter: ${protocolInfo.name}`);
        continue;
      }

      const protocolId = protocolInfo.protocolType === ProtocolType.CHAIN ? protocolInfo.id2 : protocolInfo.id;
      const protocolRecords = adapterData.protocols[protocolId]?.records ?? {};
      const firstDBDate = adapterData.protocols[protocolId]?.firstDate;
      const earliestStart = await getEarliestStartFromModule(dataModule, protocolInfo.module);

      const startTimestamp = earliestStart ?? firstDBDate;
      if (!startTimestamp || startTimestamp < january1st2023Timestamp) continue;

      const todayTimestamp = Math.floor(Date.now() / 1000);
      const currentDayTimestamp = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);

      const summary = { aggregateData: {}, adapterType } as any;

      Object.keys(protocolRecords).forEach((timeS) => {
        const record = protocolRecords[timeS];
        const aggValue = record?.aggregated?.[recordType]?.value;

        if (aggValue !== undefined) {
          summary.aggregateData[timeS] = aggValue;
        }
      });

      const missingDays = [];
      const negativeDays = [];

      for (let i = startTimestamp; i <= todayTimestamp; i += 24 * 60 * 60) {
        const timeS = new Date(i * 1000).toISOString().slice(0, 10);
        const aggValue = summary.aggregateData[timeS];
        const [year, month, day] = timeS.split("-").map(Number);
        const timestamp = Date.UTC(year, month - 1, day) / 1000;

        if (timestamp === currentDayTimestamp) continue;

        if (aggValue === undefined) {
          missingDays.push(timestamp);
        } else if (aggValue < 0) {
          negativeDays.push(timestamp);
        }
      }

      if (missingDays.length > 730) {
        console.log(`Skipping ${protocolInfo.name} due to more than 730 missing days.`);
        continue;
      }

      const addCsvRow = (filePath: string, days: number[], type: string, onlyMissing = true) => {
        if (days.length > 0) {
          const backfillCommand = `npm run backfill-local ${type.toLowerCase()} "${protocolInfo.name}"${
            onlyMissing ? " onlyMissing=true" : ""
          } timestamps=${days.join(",")}`;
          const csvRow = `${protocolInfo.name},"${days.join(",")}",${type},"${backfillCommand}"\n`;
          fs.appendFileSync(filePath, csvRow);
        }
      };

      addCsvRow(filePaths[adapterType].missing, missingDays, summary.adapterType);
      addCsvRow(filePaths[adapterType].negative, negativeDays, summary.adapterType, false);
    }
  }
}

async function cleanupEmptyCsvFiles() {
  Object.values(filePaths).forEach(({ missing, negative }) => {
    [missing, negative].forEach((filePath) => {
      if (fs.existsSync(filePath)) {
        const fileSize = fs.statSync(filePath).size;
        const headerSize = Buffer.byteLength("Protocol Name, Timestamps, Adapter Type, Backfill Command\n");
        if (fileSize <= headerSize) {
          fs.unlinkSync(filePath);
          console.log(`Deleted empty CSV file: ${filePath}`);
        }
      }
    });
  });
}

const getEarliestStartFromModule = async (dataModule: AdaptorData, moduleName: string) => {
  try {
    const module = await dataModule.importModule(moduleName);
    const chainStarts = Object.entries(module.default.adapter)
      .filter(([_chain, chainAdapter]: [string, any]) => chainAdapter.start)
      .map(([_chain, chainAdapter]: [string, any]) => {
        const startTimestamp = new Date(chainAdapter.start).getTime();
        return isNaN(startTimestamp) ? null : startTimestamp;
      })
      .filter((start): start is number => start !== null);

    return chainStarts.length > 0 ? Math.min(...chainStarts) : null;
  } catch {
    return null;
  }
};

run()
  .catch(console.error)
  .then(() => process.exit(0));
