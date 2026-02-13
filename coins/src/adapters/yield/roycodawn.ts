import { calculate4626Prices } from "../utils/erc4626";

const chain = "ethereum";
const tokens = [
  "0xcd9f5907f92818bc06c9ad70217f089e190d2a32", // srRoycoUSDC
];

export async function roycodawn(timestamp: number = 0) {
  return calculate4626Prices(chain, timestamp, tokens, "roycodawn");
}
