import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";
const chain = "arbitrum";

const name = "ETH Lend ETH-USDC GMX";
const steadefi_lv = "0x27aa75c4f7fec50A0720630E5d0f36A3bb7c6671"; //ETH  lv
const wad = 1e18;

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
  const [lvTokenValue, tokenInfos] = await Promise.all([
    call({
      target: steadefi_lv,
      chain,
      abi: abi.lvTokenValue,
      block,
    }),
    getTokenInfo(chain, [steadefi_lv], block),
  ]);
  const [{ price: priceWETH }] = await getTokenAndRedirectData(
    ["0x82af49447d8a07e3bd95bd0d56f35241523fbab1"],
    "arbitrum",
    timestamp,
  );
  const price = (lvTokenValue.output * priceWETH) / wad;

  addToDBWritesList(
    writes,
    chain,
    steadefi_lv,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    name,
    1,
  );
}

const abi = {
  lvTokenValue: {
    inputs: [],
    name: "lvTokenValue",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
};
