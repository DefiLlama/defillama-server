import adapters from "../utils/imports/emissions_adapters";
import { withTimeout } from "../utils/shared/withTimeout";
import { processSingleProtocol } from "../storeEmissions";

// ts-node defi/src/cli/backfillUnlocks.ts lido
async function main() {
  const protocolName = process.argv[3] ?? "";
  const protocolIndex = Object.keys(adapters).indexOf(protocolName);
  if (protocolIndex == -1) throw new Error(`${protocolName} is not a valid adapter`);

  const adapterCode = Object.values(adapters)[protocolIndex];
  await withTimeout(6000000, processSingleProtocol(adapterCode, protocolName, {}, true), protocolName).catch(
    (err: Error) => {
      console.log(err.message ? `${err.message}: \n storing ${protocolName}` : err);
    }
  );
}

main();
