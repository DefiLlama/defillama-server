import * as sdk from "@defillama/sdk";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
const { call } = sdk.api.abi;
import getBlock from "../utils/block";

const dCOMPToken: string = "0x91d14789071e5E195FFC9F745348736677De3292";
const dCOMPUSDOracle: string = "0x0798dE3DDb22c289A653c020863AaA7ef33C05d7";
const chain: any = "ethereum";

export async function dCOMP(timestamp: number) {
  const writes: Write[] = [];
  const block = await getBlock(chain, timestamp);

  const dCOMPUSDPriceRes = await call({
    target: dCOMPUSDOracle,
    params: [],
    chain,
    abi: "uint256:price",
    block,
  });

  addToDBWritesList(
    writes,
    chain,
    dCOMPToken,
    dCOMPUSDPriceRes.output,
    24,
    "dCOMP",
    timestamp,
    "dCOMP",
    0.9,
  );

  return writes;
}
