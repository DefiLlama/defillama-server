require("dotenv").config();

import { getProtocol, } from "./utils";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { importAdapter } from "./utils/importAdapter";
import { util } from "@defillama/sdk";
import { closeConnection } from "../api2/db";
import { getCurrentBlock } from "../storeTvlInterval/blocks";

const { humanizeNumber: { humanizeNumber } } = util

const main = async () => {
  const protocolToFill = process.argv[2]
  const protocol = getProtocol(protocolToFill);
  const now = Math.round(Date.now() / 1000);

  const adapterModule = await importAdapter(protocol)
  console.log(await getCurrentBlock({ adapterModule, catchOnlyStaleRPC: true, }))
  const ethereumBlock = undefined
  const chainBlocks = {}
  const tvl = await storeTvl(
    now,
    ethereumBlock as unknown as number,
    chainBlocks,
    protocol,
    adapterModule,
    {},
    4,
    false,
    true,
    true,
    undefined,
    { overwriteExistingData: true }
  );
  console.log("TVL", typeof tvl === "number" ? humanizeNumber(tvl) : tvl)
};

main().then(async () => {
  console.log('Done!!!')
  await closeConnection()
  process.exit(0)
})
