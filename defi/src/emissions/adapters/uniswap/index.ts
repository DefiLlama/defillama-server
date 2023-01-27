import adapter from "./uniswap";

export const uniswap = Promise.all(
  [
    "0x4750c43867EF5F89869132ecCF19B9b6C4286E1a",
    "0xe3953D9d317B834592aB58AB2c7A6aD22b54075D",
    "0x4b4e140d1f131fdad6fb59c13af796fd194e4135",
    "0x3d30b1ab88d487b0f3061f40de76845bec3f1e94",
  ].map((a: string) => adapter(a, "ethereum", "uni")),
);
export const euler = adapter(
  "0x3cc634320A3825448539176Cc6a1627FaC451BBb",
  "ethereum",
  "eul",
);
