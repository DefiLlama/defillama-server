import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";
const chain = "arbitrum";
const steadefi_lv = "0xabbe8a66bad38982b27f1410dfa0de329ae2a5da"; // WBTC lv
const copra_staedefi_wbtc = "0xEBEF5e91fDD3fc713Ce1E1e30F87C9a12cd0FA3a";
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
  const [balanceOfCopra, lvTokenValue, tokenInfos] = await Promise.all([
    call({
      target: copra_staedefi_wbtc, // steadefi_lv,
      params: steadefi_lv, // copra_staedefi_wbtc,
      chain,
      abi: "erc20:balanceOf",
      block,
    }),
    call({
      target: steadefi_lv,
      chain,
      abi: abi.lvTokenValue,
      block,
    }),
    getTokenInfo(chain, [steadefi_lv], block),
  ]);

  const price = (lvTokenValue.output * balanceOfCopra.output) / wad;

  addToDBWritesList(
    writes,
    chain,
    steadefi_lv,
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "1L-WBTCUSDC-GMX",
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
