import { call } from "../utils/starknet";
import getWrites from "../utils/getWrites";
import getBlock from "../utils/block";

const quantity = 1000000;
const XSTRK =
  "0x028d709c875c0ceac3dce7065bec5328186dc89fe254527084d1689910954b0a";

const abi = {
  name: "convert_to_assets",
  type: "function",
  inputs: [
    {
      name: "shares",
      type: "core::integer::u256",
    },
  ],
  outputs: [
    {
      type: "core::integer::u256",
    },
  ],
  state_mutability: "view",
  customInput: "address",
};

export async function xSTRK(timestamp: number) {
  const block = await getBlock("starknet", timestamp);

  const res = await call({
    target: XSTRK,
    params: ["0x" + BigInt(quantity).toString(16), "0x0"],
    abi,
    block,
  });

  const price = Number(res) / quantity;
  return await getWrites({
    chain: "starknet",
    timestamp,
    pricesObject: {
      [XSTRK]: {
        price,
        decimals: 18,
        symbol: "xSTRK",
        underlying:
          "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      },
    },
    projectName: "xSTRK",
    confidence: 0.9,
  });
}
