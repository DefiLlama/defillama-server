import { compoundPrices } from "../utils/compound-fork";

const config = {
  arbitrum: "0x8e7e9ea9023b81457ae7e6d2a51b003d421e5408",
  optimism: "0xdF0e115aA822443df9200Cc5d0260FA8E1aF06F5",
};

export function dforce(timestamp: number) {
  return Promise.all(
    Object.entries(config).map(([chain, comptroller]: any) =>
      compoundPrices({
        chain,
        timestamp,
        comptroller,
        projectName: "dforce",
        abis: {
          marketsAbi: "address[]:getAlliTokens",
        },
      }),
    ),
  );
}
