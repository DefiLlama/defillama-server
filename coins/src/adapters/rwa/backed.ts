import { call } from "@defillama/sdk/build/abi/index";
import { addToDBWritesList } from "../utils/database";
import { getTokenInfo } from "../utils/erc20";
import { Write } from "../utils/dbInterfaces";
import getBlock from "../utils/block";
// import contracts from "./contracts.json";
import abi from "./abi.json";
import { wrappedGasTokens } from "../utils/gasTokens";

const contracts = {
  oracle: "0x83Ec02059F686E747392A22ddfED7833bA0d7cE3",
  token: "0x2F123cF3F37CE3328CC9B5b8415f9EC5109b45e7",
};
export default async function getTokenPrices(chain: string, timestamp: number) {
  const writes: Write[] = [];
  const block: number | undefined = await getBlock(chain, timestamp);

  const [rate, info] = await Promise.all([
    call({
      abi: abi.latestAnswer,
      target: contracts.oracle,
      block,
      chain,
    }),
    getTokenInfo(chain, [contracts.token], block),
  ]);

  addToDBWritesList(
    writes,
    chain,
    contracts.token,
    rate.output / 10 ** 8,
    info.decimals[0].output,
    info.symbols[0].output,
    timestamp,
    "backed",
    1,
  );

  return writes;
}
export function backed(timestamp: number = 0) {
  console.log("starting backed");
  return getTokenPrices("ethereum", timestamp);
}
