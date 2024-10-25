const abi = require("./abi.json");
import { call } from "@defillama/sdk/build/abi/index";
import getBlock from "../../utils/block";
import { Write } from "../../utils/dbInterfaces";
import getWrites from "../../utils/getWrites";

const pirexEth: string = "0xD664b74274DfEB538d9baC494F3a4760828B02b0";
const pxEth: string = "0x04C154b66CB340F3Ae24111CC767e0184Ed00Cc6";
const chain: any = "ethereum";

export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  return contractCalls(block, writes, timestamp);
}

async function contractCalls(
  block: number | undefined,
  writes: Write[],
  timestamp: number,
) {
  const [
    validatorCount,
    pendingDeposit,
    buffer,
    totalSupply,
  ] = await Promise.all([
    call({
      target: pirexEth,
      chain,
      abi: abi.getStakingValidatorCount,
      block,
    }),
    call({
      target: pirexEth,
      chain,
      abi: abi.pendingDeposit,
      block,
    }),
    call({
      target: pirexEth,
      chain,
      abi: abi.buffer,
      block,
    }),
    call({
      target: pxEth,
      chain,
      abi: "erc20:totalSupply",
      block,
    }),
  ]);

  const price =
    (Number(validatorCount.output * 32e18) +
      Number(pendingDeposit.output) +
      Number(buffer.output)) /
    totalSupply.output;

  const pricesObject: any = {
    [pxEth]: {
      underlying: "0x0000000000000000000000000000000000000000",
      price,
    },
  };

  return getWrites({
    chain,
    timestamp,
    writes,
    pricesObject,
    projectName: "pxETH",
  });
}
