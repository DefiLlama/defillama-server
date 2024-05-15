import { ChainApi } from "@defillama/sdk";
import { getLogs } from "../../../utils/cache/getLogs";
import { Write } from "../../utils/dbInterfaces";
import { getApi } from "../../utils/sdk";
import { addToDBWritesList } from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";

export async function getPenpiePrices(
  timestamp: number,
  chain: string,
  config: any,
): Promise<Write[]> {
  const writes: Write[] = [];
  const api: ChainApi = await getApi(chain, timestamp);
  const { target, fromBlock } = config;
  const logs = await getLogs({
    api,
    target,
    topics: [
      "0x224e1c56d5a095bbae2a37104ca3c43212f7580c6ebb1b6b9ea1fb3eebb42e7c",
    ],
    eventAbi:
      "event Add (uint256 _allocPoint, address indexed _stakingToken, address indexed _receiptToken, address indexed _rewarder)",
    onlyArgs: true,
    fromBlock,
  });

  const receiptInfos = await getTokenInfo(
    chain,
    logs.map((l: any) => l._receiptToken),
    undefined,
  );

  logs.map((l: any, i: number) => {
    addToDBWritesList(
      writes,
      chain,
      l._receiptToken.toLowerCase(),
      undefined,
      receiptInfos.decimals[i].output,
      receiptInfos.symbols[i].output,
      timestamp,
      "penpie",
      0.98,
      `asset#${chain}:${l._stakingToken.toLowerCase()}`,
    );
  });

  return writes;
}
