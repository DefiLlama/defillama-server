import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import fs from "fs";
import path from "path";
import loadAdaptorsData from "../../adaptors/data";
import { AdaptorData } from "../../adaptors/data/types";
import { getAllItemsAfter } from "../../adaptors/db-utils/db2";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../adaptors/handlers/getOverviewProcess";
import { ADAPTER_TYPES } from "../../adaptors/handlers/triggerStoreAdaptorData";

const OUTPUT_DIR = path.join(__dirname, "reports");
const JAN_1ST_2023_TIMESTAMP = Date.UTC(2023, 0, 1) / 1000;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

const CSV_HEADER = "Protocol Name,Timestamps,Adapter Type,Backfill Command\n";
const filePaths: Record<string, { missing: string; negative: string }> = {};

for (const adapterType of ADAPTER_TYPES) {
  filePaths[adapterType] = {
    missing: initCsvFile(adapterType, "missing"),
    negative: initCsvFile(adapterType, "negative"),
  };
}

function initCsvFile(adapterType: string, dayType: "missing" | "negative"): string {
  const filePath = path.join(OUTPUT_DIR, `${adapterType}_${dayType}_days_report.csv`);
  fs.writeFileSync(filePath, CSV_HEADER);
  return filePath;
}

async function run() {
  const allCache: Record<string, { protocols: Record<string, ProtocolData> }> = {};

  for (const adapterType of ADAPTER_TYPES) {
    await fetchData(adapterType, allCache);
    await generateSummaries(adapterType, allCache);
  }

  await cleanupEmptyCsvFiles();
  process.exit(0);
}

interface ProtocolData {
  records: Record<string, number | undefined>;
  firstDate: string;
}

async function fetchData(
  adapterType: AdapterType,
  allCache: Record<string, { protocols: Record<string, ProtocolData> }>
) {
  if (!allCache[adapterType]) {
    allCache[adapterType] = { protocols: {} };
  }
  const adapterData = allCache[adapterType];

  const results = await getAllItemsAfter({ adapterType, timestamp: 0 });
  const recordType = DEFAULT_CHART_BY_ADAPTOR_TYPE[adapterType];
  if (!recordType) return;

  for (const result of results) {
    const { id, data, timeS } = result;
    const aggData = data?.aggregated?.[recordType]?.value;

    if (!adapterData.protocols[id]) {
      adapterData.protocols[id] = { records: {}, firstDate: timeS };
    }

    adapterData.protocols[id].records[timeS] = aggData;
  }
}

async function generateSummaries(
  adapterType: AdapterType,
  allCache: Record<string, { protocols: Record<string, ProtocolData> }>
) {
  const recordType = DEFAULT_CHART_BY_ADAPTOR_TYPE[adapterType];
  if (!recordType) return;

  const dataModule = loadAdaptorsData(adapterType);
  const { protocolMap } = dataModule;
  const adapterData = allCache[adapterType];

  const protocols = Object.values(protocolMap) as any[];

  const processedModules = new Set<string>();

  for (const protocolInfo of protocols) {
    if (protocolInfo.enabled === false || protocolInfo.disabled) {
      console.log(`Excluding disabled adapter: ${protocolInfo.name}`);
      continue;
    }

    if (processedModules.has(protocolInfo.module)) continue;

    if (await shouldExcludeAdapter(dataModule, protocolInfo.module)) {
      console.log(`Excluding adapter with runAtCurrTime set to true: ${protocolInfo.name}`);
      continue;
    }

    processedModules.add(protocolInfo.module);

    const protocolId = protocolInfo.protocolType === ProtocolType.CHAIN ? protocolInfo.id2 : protocolInfo.id;
    const protocolData = adapterData.protocols[protocolId];
    if (!protocolData) continue;

    const protocolRecords = protocolData.records;
    const firstDBDate = protocolData.firstDate;
    const earliestStart = await getEarliestStartFromModule(dataModule, protocolInfo.module);

    let startTimestamp: number | null = null;
    if (earliestStart) {
      // Adjust earliestStart to the next day's UTC midnight
      startTimestamp = alignToNextUTCMidnight(earliestStart);
    } else if (firstDBDate) {
      startTimestamp = alignToUTCMidnight(Date.parse(firstDBDate) / 1000);
    }

    if (!startTimestamp || startTimestamp < JAN_1ST_2023_TIMESTAMP) continue;

    const todayTimestamp = Math.floor(Date.now() / 1000);
    const currentDayTimestamp = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);

    const missingDays: number[] = [];
    const negativeDays: number[] = [];

    for (let i = startTimestamp; i < todayTimestamp; i += 86400) {
      if (i >= currentDayTimestamp) break;

      const timeS = new Date(i * 1000).toISOString().slice(0, 10);
      const aggValue = protocolRecords[timeS];

      if (aggValue === undefined) {
        missingDays.push(i);
      } else if (aggValue < 0) {
        negativeDays.push(i);
      }
    }

    if (missingDays.length > 730) continue;

    addCsvRow(filePaths[adapterType].missing, missingDays, adapterType, protocolInfo.name);
    addCsvRow(filePaths[adapterType].negative, negativeDays, adapterType, protocolInfo.name, false);
  }
}

function alignToUTCMidnight(timestamp: number): number {
  const date = new Date(timestamp * 1000);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
}

function alignToNextUTCMidnight(timestamp: number): number {
  const date = new Date((timestamp + (86400 *2)) * 1000);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
}

function addCsvRow(filePath: string, days: number[], adapterType: string, protocolName: string, onlyMissing = true) {
  if (days.length === 0) return;

  const backfillCommand = `npm run backfill-local ${adapterType.toLowerCase()} "${protocolName}"${
    onlyMissing ? " onlyMissing=true" : ""
  } timestamps=${days.join(",")}`;
  const csvRow = `${protocolName},"${days.join(",")}",${adapterType},"${backfillCommand}"\n`;
  fs.appendFileSync(filePath, csvRow);
}

async function cleanupEmptyCsvFiles() {
  for (const { missing, negative } of Object.values(filePaths)) {
    for (const filePath of [missing, negative]) {
      if (fs.existsSync(filePath)) {
        const fileSize = fs.statSync(filePath).size;
        if (fileSize <= CSV_HEADER.length) {
          fs.unlinkSync(filePath);
        }
      }
    }
  }
}

async function getEarliestStartFromModule(dataModule: AdaptorData, moduleName: string): Promise<number | null> {
  try {
    const module = await dataModule.importModule(moduleName);
    const adapterEntries = Object.values(module.default?.adapter ?? {});

    const chainStarts = adapterEntries
      .map((chainAdapter: any) => {
        const startTimestamp = chainAdapter?.start;
        return typeof startTimestamp === "number" ? startTimestamp : null;
      })
      .filter((start): start is number => start !== null);

    return chainStarts.length > 0 ? Math.min(...chainStarts) : null;
  } catch {
    return null;
  }
}

async function shouldExcludeAdapter(dataModule: AdaptorData, moduleName: string): Promise<boolean> {
  try {
    const module = await dataModule.importModule(moduleName);
    const adapter = module.default?.adapter;

    if (!adapter) return false;

    return Object.values(adapter).some((chainAdapter: any) => chainAdapter?.runAtCurrTime === true);
  } catch {
    return false;
  }
}

run().catch((error) => {
  console.error('An error occurred:', error);
  process.exit(1);
});
