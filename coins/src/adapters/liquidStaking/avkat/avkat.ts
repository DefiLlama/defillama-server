import { Write } from "../../utils/dbInterfaces";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import getBlock from "../../utils/block";
import * as sdk from "@defillama/sdk";
const { call } = sdk.api.abi;

const chain: any = "katana";
const avKAT: string = "0x7231dbaCdFc968E07656D12389AB20De82FbfCeB";
const KAT: string = "0x7F1f4b4b29f5058fA32CC7a97141b8D7e5ABDC2d";

export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);

  const { output: assets } = await call({
    target: avKAT,
    chain,
    abi: "function convertToAssets(uint256 shares) view returns (uint256)",
    params: ["1000000000000000000"],
    block,
  });

  const price = assets / 1e18;
  const now = getCurrentUnixTimestamp();

  const write = {
    PK: `asset#${chain}:${avKAT.toLowerCase()}`,
    price,
    adapter: "avkat",
    symbol: "avKAT",
    decimals: 18,
    underlying: `asset#${chain}:${KAT.toLowerCase()}`,
    confidence: 0.5,
  };

  let writes: Write[];
  if (timestamp == 0) {
    writes = [
      { ...write, SK: 0, timestamp: now },
      { ...write, SK: now },
    ];
  } else {
    writes = [{ ...write, SK: now }];
  }

  console.log(writes);

  return writes;
}
