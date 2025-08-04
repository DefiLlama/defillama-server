import adapters from "../utils/imports/emissions_adapters";
import { processSingleProtocol } from "../storeEmissionsUtils";
import setEnvSecrets from "../utils/shared/setEnvSecrets";

async function main() {
  const protocolName = process.argv[2] ?? "";
  const protocolIndex = Object.keys(adapters).indexOf(protocolName);
  if (protocolIndex == -1) throw new Error(`${protocolName} is not a valid adapter`);

  await setEnvSecrets();
  const adapterCode = Object.values(adapters)[protocolIndex].default;
  await processSingleProtocol(adapterCode, protocolName, {}, true).catch((err: Error) => {
    console.log(err.message ? `${err.message}: \n storing ${protocolName}` : err);
  });
  process.exit();
}

main(); // ts-node defi/src/cli/backfillEmissions.ts across
