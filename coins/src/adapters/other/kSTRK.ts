import { Write } from "../utils/dbInterfaces";
import { call } from "../utils/starknet";
import { addToDBWritesList, getTokenAndRedirectData } from "../utils/database";

const TOKEN =
  "0x045cd05ee2caaac3459b87e5e2480099d201be2f62243f839f00e10dde7f500c";
const POOL =
  "0x057ea05c22d6b162d0f2ef4b3d1e1edf3c065d81cf0f41950f716a71e9ad6bae";

const abis = [
  {
    name: "get_total_stake",
    type: "function",
    inputs: [],
    outputs: [
      {
        type: "core::integer::u128",
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
];

export async function kSTRK(timestamp: number = 0) {
  const totalAssets = await call({ target: POOL, abi: abis[0] });
  const totalSupply = await call({ target: TOKEN, abi: abis[1] });
  const [{ price: basePrice }] = await getTokenAndRedirectData(
    ["starknet"],
    "coingecko",
    timestamp,
  );
  const price = Number(totalAssets / totalSupply) * basePrice;

  const writes: Write[] = [];
  addToDBWritesList(
    writes,
    "starknet",
    TOKEN,
    price,
    18,
    "kSTRK",
    timestamp,
    "kSTRK",
    0.9,
  );

  return writes;
}
