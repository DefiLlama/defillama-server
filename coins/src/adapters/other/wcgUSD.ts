import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import getBlock from "../utils/block";
import { call } from "@defillama/sdk/build/abi/index";
import BigNumber from "bignumber.js";
import getWrites from "../utils/getWrites";
import { getApi } from "../utils/sdk";

const chain = "base";

const wcgUSDToken = {
  address: "0x5ae84075f0e34946821a8015dab5299a00992721",
  symbol: "wcgUSD",
  decimals: 6,
}

const abi = {
  totalSupply: 
  {
      stateMutability: 'view',
      type: 'function',
      inputs: [],
      name: 'totalSupply',
      outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
  getTotalShares: {
      stateMutability: 'view',
      type: 'function',
      inputs: [],
      name: 'getTotalShares',
      outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
  },
};

const contractAddr = '0xCa72827a3D211CfD8F6b00Ac98824872b72CAb49';

export function wcgUSD(timestamp: number = 0) {
  return getTokenPrice(timestamp);
}

async function getTokenPrice(timestamp: number) {
  const api = await getApi(chain, timestamp)

  const writes: Write[] = [];

  const [totalSupply, totalShares] = await Promise.all([
    api.multiCall({ abi: abi.totalSupply, calls: [contractAddr] }),
    api.multiCall({ abi: abi.getTotalShares, calls: [contractAddr] }),
  ]);

  console.info(totalSupply, totalShares);

  console.info(totalSupply.toString(), totalShares.toString());

  const ratio = new BigNumber(totalSupply.toString()).div(totalShares.toString());

  // USD price of cgUSD
  const [{ price: priceOfcgUSD }] = await getTokenAndRedirectData([contractAddr], "base", timestamp);

  console.info('ratio:', ratio.toNumber(), 'priceOfcgUSD:', priceOfcgUSD);
  // wcgUSD price = (totalSupply / totalShares) * cgUSD
  const price = ratio.toNumber() * priceOfcgUSD;

  const pricesObject = {};

  pricesObject[wcgUSDToken.address] = {
      token: wcgUSDToken.address,
      price,
      symbol: wcgUSDToken.symbol,
      decimals: wcgUSDToken.decimals,
  }

  console.info('pricesObject:', pricesObject);

  return getWrites({ chain, timestamp, writes, pricesObject, projectName: 'cygnus' })
}
