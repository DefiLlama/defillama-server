import { multiCall } from "@defillama/sdk/build/abi/index";
import { addToDBWritesList } from "../../utils/database";
import { Write } from "../../utils/dbInterfaces";
import abi from "./abi.json";
import { Result } from "../../utils/sdkInterfaces";
import { getLogs, lookupBlock } from "@defillama/sdk/build/util";
import { getCurrentUnixTimestamp } from "../../../utils/date";
import { getLpPrices, TokenValues } from "./balancer";

const factories: { [chain: string]: { address: string; fromBlock: number } } = {
  arbitrum: {
    address: "0xa3B9515A9c557455BC53F7a535A85219b59e8B2E",
    fromBlock: 59209879,
  },
  polygon: {
    address: "0x7bc6c0e73edaa66ef3f6e2f27b0ee8661834c6c9",
    fromBlock: 39037615,
  },
};

async function getPools(chain: any, block: number): Promise<string[]> {
  const tokens: string[] = [];

  (
    await getLogs({
      target: factories[chain].address,
      topic:
        "0x83a48fbcfc991335314e74d0496aab6a1987e992ddc85dddbcc4d6dd6ef2e9fc",
      topics: [],
      keys: [],
      fromBlock: factories[chain].fromBlock,
      toBlock: block,
      chain,
    })
  ).output.map((l: any) => {
    if (!l.topics || !l.topics[1]) return;
    const token: string = `0x${l.topics[1].substring(26)}`;
    if (!tokens.includes(token)) tokens.push(token);
  });

  return tokens;
}
export default async function getTokenPrices(
  chain: any,
  timestamp: number,
): Promise<Write[]> {
  let writes: Write[] = [];

  const block: number = (
    await lookupBlock(timestamp == 0 ? getCurrentUnixTimestamp() : timestamp, {
      chain,
    })
  ).block;

  const tokens = await getPools(chain, block);

  const poolIds = (
    await multiCall({
      calls: tokens.map((target: string) => ({ target })),
      abi: abi.getPoolId,
      chain,
      block,
    })
  ).output.map((p: Result) => p.output);

  const values: TokenValues[] = await getLpPrices(
    poolIds,
    chain,
    timestamp,
    block,
    abi.getVirtualSupply,
  );

  values.map((v: TokenValues) => {
    addToDBWritesList(
      writes,
      chain,
      v.address,
      v.price,
      v.decimals,
      v.symbol,
      timestamp,
      "balancer-linear",
      1,
    );
  });

  return writes;
}
