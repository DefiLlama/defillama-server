import { AdapterType, ProtocolType } from "@defillama/dimension-adapters/adapters/types";
import * as fs from "fs";
import * as path from "path";
import readline from "readline";
import loadAdaptorsData from "../../data";
import { getAllItemsAfter } from "../../db-utils/db2";
import { DEFAULT_CHART_BY_ADAPTOR_TYPE } from "../../handlers/getOverviewProcess";
import { getStringArrUnique } from "../../utils/getAllChainsFromAdaptors";
import "../setup";
import executeAsyncBackfill from "./executeAsyncBackfill";

const outputDir = path.join(__dirname, "output");
const january1st2023Timestamp = Date.UTC(2023, 0, 1) / 1000;

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const executeMissingDimensionBackfill = async (adapterType: AdapterType) => {
  const dataModule = loadAdaptorsData(adapterType);
  const allCache: Record<string, any> = {};
  const missingTimestamps: Record<string, number[]> = {};

  await fetchData(adapterType);

  const results = await generateMissingBackfillEvents(adapterType);
  if (results) {
    saveResultsToFile(adapterType, results);
    console.info(`Missing backfill data saved to ${path.join(outputDir, "backfill_event.json")}`);

    const backfillFilePath = path.join(outputDir, "backfill_event.json");
    const backfillEvent = JSON.parse(fs.readFileSync(backfillFilePath, "utf8"));
    console.info(`Backfill event saved to ${backfillFilePath}`);

    const uniqueModules2Backfill = getStringArrUnique([...backfillEvent.backfill.map((n: any) => n.dexNames).flat(1)]);
    console.info(`${uniqueModules2Backfill.length} protocols will be backfilled`);

    uniqueModules2Backfill.forEach((protocolName) => {
      const protocolBackfills = backfillEvent.backfill.filter((item: any) => item.dexNames.includes(protocolName));
      if (protocolBackfills.length > 0) {
        const timestamps = protocolBackfills.map((item: any) => item.timestamp);
        const earliestTimestamp = Math.min(...timestamps);
        const startDate = formatTimestampAsDate(earliestTimestamp);
        const daysToFill = timestamps.length;
        console.info(`${protocolName} - starting from ${startDate} - ${daysToFill} days will be filled`);
      }
    });

    const rl = readline.createInterface({
      input: process.stdin as any,
      output: process.stdout as any,
    });

    rl.question("Do you wish to continue? y/n\n", async function (yn) {
      if (yn.toLowerCase() === "y") {
        const totalBackfillEvents = backfillEvent.backfill.length;

        for (const [index, event] of backfillEvent.backfill.entries()) {
          const progressTotalBackfill = Math.floor(((index + 1) / totalBackfillEvents) * 100);
          const progressPercentage = ((progressTotalBackfill / totalBackfillEvents) * 100).toFixed(2);
          console.warn(`Progress: ${progressTotalBackfill}/${totalBackfillEvents} events backfilled (${progressPercentage}%)\n`);

          console.info(`\nBackfilling for ${event.dexNames} at ${formatTimestampAsDate(event.timestamp)}...`);
          await executeAsyncBackfill({
            type: backfillEvent.type,
            backfill: [event],
          });
          console.info(`Backfill completed for ${formatTimestampAsDate(event.timestamp)}.`);
        }
        console.info("\nBackfill completed successfully for all timestamps.");
      } else {
        console.info("Backfill cancelled.");
      }
      rl.close();
    });
  } else {
    console.error("No missing backfill events were found.");
  }

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

  async function generateMissingBackfillEvents(adapterType: AdapterType): Promise<Record<string, number[]> | null> {
    const recordType = DEFAULT_CHART_BY_ADAPTOR_TYPE[adapterType];
    if (!recordType) return null;

    let { protocolMap: dimensionProtocolMap } = dataModule;
    const adapterData = allCache[adapterType];
    const todayTimestamp = Math.floor(Date.now() / 1000);
    const currentDayTimestamp = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000);

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

      const missingDays: number[] = [];

      for (let i = startTimestamp; i <= todayTimestamp; i += 24 * 60 * 60) {
        const timeS = new Date(i * 1000).toISOString().slice(0, 10);
        const aggValue = protocolRecords[timeS]?.aggregated?.[recordType]?.value;
        const [year, month, day] = timeS.split("-").map(Number);
        const timestamp = Date.UTC(year, month - 1, day) / 1000;

        if (timestamp === currentDayTimestamp) continue;

        if (aggValue === undefined) {
          missingDays.push(timestamp);
        }
      }

      if (missingDays.length > 0) {
        missingTimestamps[protocolInfo.name] = missingDays;
      }
    }

    return Object.keys(missingTimestamps).length > 0 ? missingTimestamps : null;
  }

  function saveResultsToFile(adapterType: AdapterType, data: Record<string, number[]>) {
    const backfillEvent = {
      type: adapterType,
      backfill: Object.entries(data).flatMap(([adapterName, timestamps]) =>
        timestamps.map((timestamp) => ({
          dexNames: [adapterName],
          timestamp,
        }))
      ),
    };

    const outputFilePath = path.join(outputDir, "backfill_event.json");
    fs.writeFileSync(outputFilePath, JSON.stringify(backfillEvent, null, 2));
  }
};

const getEarliestStartFromModule = async (dataModule: any, moduleName: string) => {
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

function formatTimestampAsDate(timestamp: number) {
  const date = new Date(timestamp * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
}

const adapterType = process.argv[2] as AdapterType;
if (!adapterType) {
  console.error("Please provide an adapter type as argument.");
  process.exit(1);
}

executeMissingDimensionBackfill(adapterType).catch(console.error);

