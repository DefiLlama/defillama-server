import { PromisePool } from "@supercharge/promise-pool";
import adapters from "./utils/imports/emissions_adapters";
import { EmissionBreakdown, Protocol } from "../emissions-adapters/types/adapters";
import { storeR2JSONString } from "./utils/r2";
import { shuffleArray } from "./utils/shared/shuffleArray";
import { sendMessage } from "./utils/discord";
import { withTimeout } from "./utils/shared/withTimeout";
import { processSingleProtocol } from "./storeEmissionsUtils";

export async function processProtocolList() {
  let protocolsArray: string[] = [];
  let protocolErrors: string[] = [];
  let emissionsBrakedown: EmissionBreakdown = {};

  const protocolAdapters = Object.entries(adapters);
  await PromisePool.withConcurrency(5)
    .for(shuffleArray(protocolAdapters))
    .process(async ([protocolName, rawAdapter]) => {
      let adapters = typeof rawAdapter.default === "function" ? await rawAdapter.default() : rawAdapter.default;
      if (!adapters.length) adapters = [adapters];
      await Promise.all(
        adapters.map((adapter: Protocol) =>
          withTimeout(6000000, processSingleProtocol(adapter, protocolName, emissionsBrakedown), protocolName)
            .then((p: string) => protocolsArray.push(p))
            .catch((err: Error) => {
              console.log(err.message ? `${err.message}: \n storing ${protocolName}` : err);
              protocolErrors.push(protocolName);
            })
        )
      );
    });

  await handlerErrors(protocolErrors);

  await storeR2JSONString("emissionsProtocolsList", JSON.stringify([...new Set(protocolsArray)]));

  await storeR2JSONString("emissionsBreakdown", JSON.stringify(emissionsBrakedown));
}

async function handlerErrors(errors: string[]) {
  if (errors.length > 0) {
    let errorMessage: string = `storeEmissions errors: \n`;
    errors.map((e: string) => (errorMessage += `${e}, `));
    process.env.UNLOCKS_WEBHOOK
      ? await sendMessage(errorMessage, process.env.UNLOCKS_WEBHOOK!)
      : console.log(errorMessage);
  }
}

export async function handler() {
  try {
    await withTimeout(8400000, processProtocolList());
  } catch (e) {
    process.env.UNLOCKS_WEBHOOK ? await sendMessage(`${e}`, process.env.UNLOCKS_WEBHOOK!) : console.log(e);
  }
  process.exit();
}

// export default wrapScheduledLambda(handler);
handler(); // ts-node defi/src/storeEmissions.ts
