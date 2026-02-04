import { getCurrentUnixTimestamp } from "../../utils/date";
import { addToDBWritesList } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import { getApi } from "../utils/sdk";

const now = getCurrentUnixTimestamp();
const threeHours = 3 * 60 * 60;

const contracts: { [chain: string]: { target: string; queries: string[] } } = {
  merlin: {
    target: "0x6717DC0D87a9BD6849F96948c29e8c8875c10096",
    queries: [
      "0x4920fb03f3ea1c189dd216751f8d073dd680a136",
      "0xb00db5faae7682d80ca3ce5019e710ca08bfbd66",
      "0xa41a8c64a324cd00cb70c2448697e248ea0b1ff2",
    ],
  },
};

export async function pythAgg(timestamp: number) {
  const writes: Write[] = [];

  await Promise.all(
    Object.keys(contracts).map(async (chain: string) => {
      const api = await getApi(chain, timestamp == 0 ? now : timestamp);
      const { target, queries } = contracts[chain];
      const calls = queries.map((params: string) => ({ params }));
      const [decimals, latestTimestamp, rates, metadata] = await Promise.all([
        api.call({ target, abi: "function decimals() view returns (uint8)" }),
        api.call({
          target,
          abi: "function latestTimestamp() view returns (uint256)",
        }),
        api.multiCall({
          target,
          abi: "function getAnswer(uint256) view returns (uint256)",
          calls,
        }),
        getTokenInfo(chain, queries, undefined),
      ]);

      if ((timestamp == 0 ? now : timestamp) - latestTimestamp > threeHours)
        throw new Error(`pyth is stale`);

      rates.forEach((r, i) => {
        addToDBWritesList(
          writes,
          chain,
          queries[i],
          r / 10 ** decimals,
          metadata.decimals[i].output,
          metadata.symbols[i].output,
          timestamp,
          "pythAggV3",
          0.95,
        );
      });
    }),
  );

  return writes;
}
