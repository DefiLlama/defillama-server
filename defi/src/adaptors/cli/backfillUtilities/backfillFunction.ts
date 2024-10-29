import { AdapterType } from "@defillama/dimension-adapters/adapters/types";
import fs from "fs";
import path from "path";
import readline from "readline";
import { getStringArrUnique } from "../../utils/getAllChainsFromAdaptors";
import executeAsyncBackfill from "./executeAsyncBackfill";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const formatTimestampAsDate = (timestamp: number) => {
  const date = new Date(timestamp * 1000);
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
};

export interface ICliArgs {
  onlyMissing: boolean;
  chain?: string;
  version?: string;
  timestamp?: number;
  timestamps?: number[];
  endTimestamp?: number;
  recordTypes?: string[];
}

export const autoBackfill = async (argv: string[]) => {
  if (argv.length < 3) {
    console.error(
      `Not enough args! Please, use\nnpm run backfill <type> <adapterName>\nor\nnpm run backfill <type> <adapterName> onlyMissing\nor\nnpm run backfill-local`
    );
    process.exit(1);
  }

  const type = argv[2] as AdapterType;
  const adapterName = argv[3].split(",") as string[];

  const cliArguments = argv
    .filter((arg) => arg.includes("="))
    .reduce(
      (acc, cliArg) => {
        const [rawArgumentName, value] = cliArg.split("=");

        if (rawArgumentName === "onlyMissing") {
          acc.onlyMissing = value === "true" || !value ? true : false;
        } else if (rawArgumentName === "chain") {
          if (value) acc.chain = value;
          else throw new Error("Please provide a value for chain=[chain]");
        } else if (rawArgumentName === "version") {
          if (value) acc.version = value;
          else throw new Error("Please provide a value for version=[version]");
        } else if (rawArgumentName === "timestamps") {
          const timestampsArray = value.split(",").map((ts) => parseInt(ts, 10));
          if (timestampsArray.length > 0) acc.timestamps = timestampsArray;
          else throw new Error("Please provide valid timestamps as a comma-separated list");
        } else if (rawArgumentName === "timestamp") {
          if (!isNaN(+value)) acc.timestamp = +value;
          else throw new Error("Please provide a proper value for timestamp=[timestamp]");
        } else if (rawArgumentName === "endTimestamp") {
          if (!isNaN(+value)) acc.endTimestamp = +value;
          else throw new Error("Please provide a proper value for endTimestamp=[timestamp]");
        } else if (rawArgumentName === "recordTypes") {
          const recordTypes = value?.split(",");
          if (recordTypes && recordTypes.length > 0) acc.recordTypes = recordTypes;
          else throw new Error("Please provide a value for recordType=[recordType]");
        }

        return acc;
      },
      {
        onlyMissing: false,
      } as ICliArgs
    );

  if (cliArguments.timestamp && !cliArguments.timestamps) {
    const todayTimestamp = Math.floor(Date.now() / 1000);
    cliArguments.endTimestamp = cliArguments.endTimestamp || todayTimestamp;

    cliArguments.timestamps = [];
    for (let ts = cliArguments.timestamp; ts <= cliArguments.endTimestamp; ts += 86400) {
      cliArguments.timestamps.push(ts);
    }
  }

  if (!cliArguments.timestamps && !cliArguments.timestamp && !cliArguments.endTimestamp) {
    console.warn("No specific timestamp provided. Using last 30 days by default.");

    const today = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = today - 86400 * 30;
    cliArguments.timestamps = [];

    for (let ts = thirtyDaysAgo; ts <= today; ts += 86400) {
      cliArguments.timestamps.push(ts);
    }
  }

  console.info(`Started backfilling for ${adapterName} adapter`);

  if (cliArguments.timestamps && cliArguments.timestamps.length > 0) {
    const backfillEvent = {
      type: type,
      backfill: cliArguments.timestamps.map((timestamp) => ({
        dexNames: adapterName,
        timestamp,
      })),
    };

    const backfillFilePath = path.join(__dirname, "output", "backfill_event.json");
    fs.writeFileSync(backfillFilePath, JSON.stringify(backfillEvent, null, 2));
    console.info(`Backfill event saved to ${backfillFilePath}`);

    const uniqueModules2Backfill = getStringArrUnique([...backfillEvent.backfill.map((n) => n.dexNames).flat(1)]);
    console.info(`${uniqueModules2Backfill.length} protocols will be backfilled`);
    console.info(
      `${uniqueModules2Backfill} will be backfilled starting from ${formatTimestampAsDate(
        backfillEvent.backfill[0].timestamp!
      )}`
    );
    console.info(
      `${backfillEvent.backfill.length} days will be filled. If a chain is already available, it will be refilled.`
    );

    rl.question("Do you wish to continue? y/n\n", async function (yn) {
      if (yn.toLowerCase() === "y") {
        for (const event of backfillEvent.backfill) {
          console.info(`Backfilling for ${formatTimestampAsDate(event.timestamp)}...`);
          await executeAsyncBackfill({
            type: backfillEvent.type,
            backfill: [event],
          });
          console.info(`Backfill completed for ${formatTimestampAsDate(event.timestamp)}.`);
        }
        console.info("Backfill completed successfully for all timestamps.");
      } else {
        console.info("Backfill cancelled.");
      }
      rl.close();
    });
  } else {
    console.error("No timestamps provided!");
    rl.close();
  }
};
