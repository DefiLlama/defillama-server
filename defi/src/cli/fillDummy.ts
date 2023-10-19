require("dotenv").config();

import { getProtocol, } from "./utils";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { importAdapter } from "./utils/importAdapter";
import { closeConnection } from "../api2/db";

const main = async () => {
  const protocolToFill = process.argv[2]
  const protocol = getProtocol(protocolToFill);
  const now = Math.round(Date.now() / 1000);
  if(protocol.module !== "dummy.js"){
    throw new Error("Protocol module is not dummy.js")
  }

  const adapterModule = await importAdapter(protocol)
  const ethereumBlock = undefined
  const chainBlocks = {}
  await storeTvl(
    now,
    ethereumBlock as unknown as number,
    chainBlocks,
    protocol,
    adapterModule,
    {},
    4,
    false,
    true,
    false,
    undefined,
    { overwriteExistingData: true }
  );
};

main().then(async () => {
  console.log('Done!!!')
  await closeConnection()
  process.exit(0)
})
