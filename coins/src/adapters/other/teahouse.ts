import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";

const teahouse_vault = "0xB38e48B8Bc33CD65551BdaC8d954801D56625eeC";
const chain = "arbitrum";

export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  await contractCalls(block, writes, timestamp);
  return writes;
}

async function contractCalls(
  block: number | undefined,
  writes: Write[],
  timestamp: number,
) {
  const teahouseV3 = "0x99c2901d2883F8D295A989544f118e31eC21823e"; // to price

  const [token0Value, totalSupply, tokenInfos] = await Promise.all([
    call({
      target: teahouse_vault,
      chain,
      abi: contractAbi.estimatedValueInToken0,
      block,
    }),
    call({
      target: teahouse_vault,
      chain,
      abi: contractAbi.totalSupply,
      block,
    }),
    getTokenInfo(chain, [teahouseV3], block),
  ]);

  const [{ price: priceWETH }] = await getTokenAndRedirectData(
    ["0x82af49447d8a07e3bd95bd0d56f35241523fbab1"],
    "arbitrum",
    timestamp,
  );

  const estimatedAmount = token0Value.output / totalSupply.output;
  const price = estimatedAmount * priceWETH * 1e12;

  addToDBWritesList(
    writes,
    chain,
    teahouseV3,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "TEA-PL-WETH-WSTETH-100",
    1,
  );
}

const contractAbi = {
  estimatedValueInToken0: {
    constant: true,
    inputs: [],
    name: "estimatedValueInToken0",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  totalSupply: {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
};
