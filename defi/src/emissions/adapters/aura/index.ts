import adapter from "./aura";
import auraBalAdapter from "./auraBal";
const maxSupply = 100_000_000;

export const treasury = adapter(
  "0x43B17088503F4CE1AED9fB302ED6BB51aD6694Fa",
  "ethereum",
  maxSupply * 0.175,
);
export const balancer = adapter(
  "0xFd72170339AC6d7bdda09D1eACA346B21a30D422",
  "ethereum",
  maxSupply * 0.02,
);
export const auraBalRewards = auraBalAdapter(
  "0xC47162863a12227E5c3B0860715F9cF721651C0c",
  "ethereum",
  maxSupply * 0.1,
);
