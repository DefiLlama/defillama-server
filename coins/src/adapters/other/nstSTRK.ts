import { Write } from "../utils/dbInterfaces";
import { call } from "../utils/starknet";

import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

export function nstSTRK(timestamp: number = 0) {
  return Promise.all([getTokenPrice(timestamp)])
}

const STAKED_STRK = "0x04619e9ce4109590219c5263787050726be63382148538f3f936c22aa87d2fc2";

async function getTokenPrice(timestamp: number) {
  const abis = [
    {
      name: "total_assets",
      type: "function",
      inputs: [],
      outputs: [
        {
          type: "core::integer::u256",
        },
      ],
      state_mutability: "view",
    },
    {
      name: "total_supply",
      type: "function",
      inputs: [],
      outputs: [
        {
          type: "core::integer::u256",
        },
      ],
      state_mutability: "view",
    },
  ]
  const totalAssets = await call({ target: STAKED_STRK, abi: abis[0], })
  const totalSupply = await call({ target: STAKED_STRK, abi: abis[1], })
  const basePrice = await getTokenAndRedirectData(['starknet'], 'coingecko', timestamp)
  const price = Number(totalAssets / totalSupply) * basePrice[0].price
  const writes: Write[] = [];
  addToDBWritesList(writes, 'starknet', '0x04619e9ce4109590219c5263787050726be63382148538f3f936c22aa87d2fc2',  price, 18, 'nstSTRK', timestamp, 'nstSTRK', 0.9)

  return writes
}
