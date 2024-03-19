import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";
const chain = "arbitrum";

const name ="ETH Lend ETH-USDC GMX"
const steadefi_lv = "0x27aa75c4f7fec50A0720630E5d0f36A3bb7c6671"; //ETH  lv
const copra_steadefi_eth = "0xFd7691716eD342Da087036F69712D966D45e666e";
const wad = 1e18;


const targets = [
  steadefi_lv,
  copra_steadefi_eth,
];
export default async function getTokenPrice(timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const writes: Write[] = [];
  await contractCalls(targets, block, writes, timestamp);
  return writes;
}

async function contractCalls(
  targets: string[],
  block: number | undefined,
  writes: Write[],
  timestamp: number,
) {
  const [
    balanceOfCopra,
    lvTokenValue,
    tokenInfos,
  ] = await Promise.all([
    call({
      target: targets[0],
      params: copra_steadefi_eth,
      chain,
      abi: "address:balanceOf",
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: abi.lvTokenValue,
      block,
    }),
    getTokenInfo(chain, [targets[0]], block),
  ]);

  const price = (lvTokenValue * balanceOfCopra) /wad

  addToDBWritesList(
    writes,
    chain,
    targets[0],
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    name,
    1,
  );
}

const abi = {
  lvTokenValue:   {
    "inputs": [],
    "name": "lvTokenValue",
    "outputs": [
        {
            "internalType": "uint256",
            "name": "",
            "type": "uint256"
        }
    ],
    "stateMutability": "view",
    "type": "function"
}
};
