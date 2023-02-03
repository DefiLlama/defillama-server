import masterchef from "./sushi";
import devFund from "./devFund";

export const auraMasterchef = masterchef(
  "0x1ab80f7fb46b25b7e0b2cfac23fc88ac37aaf4e9",
  "ethereum",
);
export const sushiMasterchef = masterchef(
  "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd",
  "ethereum",
  [45],
);
export const sushiDevFund = devFund(
  "0xc2edad668740f1aa35e4d8f227fb8e17dca888cd",
  "ethereum",
  [45],
);
