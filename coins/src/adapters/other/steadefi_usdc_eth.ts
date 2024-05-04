import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";
const chain = "arbitrum";

const name = "USDC Lend ETH-USDC GMX";
const steadefi_lv = "0xa9ED07Ba2e3347F0068A3F0B9d2d943AE7D86F90"; //USDC - eth  lv
const wad = 1e6;

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
  const [{ price: priceUSDC }] = await getTokenAndRedirectData(
    ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831"],
    "arbitrum",
    timestamp,
  );
  const price = (lvTokenValue.output * priceUSDC) / wad;

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
