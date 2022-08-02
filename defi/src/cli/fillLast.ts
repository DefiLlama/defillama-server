require("dotenv").config();

import { getProtocol, getBlocksRetry } from "./utils";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../utils/shared/coingeckoLocks";
import { importAdapter } from "./utils/importAdapter";
import { humanizeNumber } from "@defillama/sdk/build/computeTVL/humanizeNumber";

const main = async () => {
  const protocolToFill = process.argv[2]
  const protocol = getProtocol(protocolToFill);
  const now = Math.round(Date.now() / 1000);

  const { ethereumBlock, chainBlocks } = await getBlocksRetry(now);
  setInterval(() => {
    releaseCoingeckoLock();
  }, 1.5e3);
  const adapterModule = await importAdapter(protocol)
  const tvl = await storeTvl(
    now,
    ethereumBlock,
    chainBlocks,
    protocol,
    adapterModule,
    {},
    4,
    getCoingeckoLock,
    false,
    true,
    true,
  );
  console.log("TVL", typeof tvl === "number" ? humanizeNumber(tvl):tvl)
};
main();
