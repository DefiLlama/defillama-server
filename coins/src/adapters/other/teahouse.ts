import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";

const teahouse_vault = "0xB38e48B8Bc33CD65551BdaC8d954801D56625eeC";

const targets = [
  teahouse_vault, // lending vault
];
const chain = "arbitrum";

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
  
  const teahouseV3 = "0x99c2901d2883F8D295A989544f118e31eC21823e"; // to price
  const corpa_teahouse = "0x9aa3C3d624e1503bE3B6808bb45b0608F3Ad6841"; 

  const [
    shareAmount,
    estimatedValueInToken0,
    totalSupply,
    tokenInfos,
  ] = await Promise.all([
    call({
      target: teahouseV3,
      params: corpa_teahouse,
      chain,
      abi: "erc20:balanceOf",
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: contractAbi.estimatedValueInToken0,
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: contractAbi.totalSupply,
      block,
    }),
    getTokenInfo(chain, [teahouseV3], block),
  ]);

  const [{ price: priceWETH }] = await getTokenAndRedirectData(
  ["0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"],
  "arbitrum",
  timestamp,
  );
  const [{ price: priceWstETH }] = await getTokenAndRedirectData(
  ["0x5979D7b546E38E414F7E9822514be443A4800529"],
  "arbitrum",
  timestamp,
  );

const estimatedAmount= (shareAmount * estimatedValueInToken0 / totalSupply); 
const r =  priceWstETH  / priceWETH;
const price = estimatedAmount * r;

  addToDBWritesList(
    writes,
    chain,
    targets[1],
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
  estimatedValueInToken1: {
    constant: true,
    inputs: [],
    name: "estimatedValueInToken1",
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
