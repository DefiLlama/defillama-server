require("dotenv").config();
const protocolToFill = "aave"

import { getProtocol, getBlocksRetry } from "./utils";
import { storeTvl } from "../storeTvlInterval/getAndStoreTvl";
import {
  getCoingeckoLock,
  releaseCoingeckoLock,
} from "../utils/shared/coingeckoLocks";
import { importAdapter } from "./utils/importAdapter";

const main = async () => {
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
  console.log("TVL", tvl)
};
main();
