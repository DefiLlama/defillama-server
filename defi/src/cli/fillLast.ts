require("dotenv").config();

import { getProtocol, } from "./utils";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import { importAdapterDynamic } from "../utils/imports/importAdapter";
import { util } from "@defillama/sdk";
import { closeConnection } from "../api2/db";
import { getCurrentBlock } from "../storeTvlInterval/blocks";

const { humanizeNumber: { humanizeNumber } } = util

const main = async () => {
  const protocolToFill = process.argv[2]
  const protocol = getProtocol(protocolToFill);
  const now = Math.round(Date.now() / 1000);

  const adapterModule = await importAdapterDynamic(protocol)
  const blockData = await getCurrentBlock({ adapterModule, catchOnlyStaleRPC: true, })
  console.log(blockData)
  const ethereumBlock = blockData.ethereumBlock
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
    protocol.module !== "dummy.js",
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
