import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";

// Moo BVM (BVM-ETH)
const targets = [
  "0x53713F956A4DA3F08B55A390B20657eDF9E0897B",
  "0xa3A4a4bf50B7b0d766b99C8d4B0F0E7fD02658a6",
];
const chain = "base";

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
    reserve0,
    reserve1,
    totalSupply,
    multiplier,
    tokenInfos,
  ] = await Promise.all([
    call({
      target: targets[0],
      chain,
      abi: contractAbi.reserve0,
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: contractAbi.reserve1,
      block,
    }),
    call({
      target: targets[0],
      chain,
      abi: contractAbi.totalSupply,
      block,
    }),
    call({
      target: targets[1],
      chain,
      abi: contractAbiBeefy.getPricePerFullShare,
      block,
    }),
    getTokenInfo(chain, [targets[1]], block),
  ]);

  const [{ price: priceEth }] = await getTokenAndRedirectData(
    ["0x4200000000000000000000000000000000000006"],
    "base",
    timestamp,
  );
  const [{ price: priceBvm }] = await getTokenAndRedirectData(
    ["0xd386a121991e51eab5e3433bf5b1cf4c8884b47a"],
    "base",
    timestamp,
  );

  let price =
    (reserve0.output * priceEth + reserve1.output * priceBvm) /
    totalSupply.output;
  price *= multiplier.output / 1e18; // mutiplier decimals removed
  price = priceEth / price;

  addToDBWritesList(
    writes,
    chain,
    targets[1],
    price,
    tokenInfos.decimals[0].output,
    tokenInfos.symbols[0].output,
    timestamp,
    "Moo BVM BVM-ETH",
    1,
  );
}

const contractAbi = {
  reserve0: {
    constant: true,
    inputs: [],
    name: "reserve0",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  reserve1: {
    constant: true,
    inputs: [],
    name: "reserve1",
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
const contractAbiBeefy = {
  getPricePerFullShare: {
    constant: true,
    inputs: [],
    name: "getPricePerFullShare",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
};
