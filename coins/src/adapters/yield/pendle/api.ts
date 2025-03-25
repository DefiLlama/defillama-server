import fetch from "node-fetch";
import { Write } from "../../utils/dbInterfaces";
import { addToDBWritesList } from "../../utils/database";
import { chainIdMap } from "../../bridges/celer";

type Asset = {
  chainId: number;
  address: string;
  decimals: number;
  symbol: string;
  price: number;
};

const allAssets: { [chainId: string]: string[] } = {
  1: [
    // ethereum
    "0xe45d2ce15abba3c67b9ff1e7a69225c855d3da82",
    "0x1a88df1cfe15af22b3c4c783d4e6f7f9e0c1885d",
    "0x38ea452219524bb87e18de1c24d3bb59510bd783",
    "0x84631c0d0081fde56deb72f6de77abbbf6a9f93a",
    "0xc673ef7791724f0dcca38adb47fbb3aef3db6c80",
    "0x46e6b4a950eb1abba159517dea956afd01ea9497", 
    "0xc387ad871d94990e073f1bd0b759ffdb5e0313aa"
  ],
  56: [
    // bsc
    "0x61b79369738fad86c4e948fc775048104b7ffbf0",
    "0xe08fc3054450053cd341da695f72b18e6110fffc",
    "0xe8f1c9804770e11ab73395be54686ad656601e9e",
    "0x35e5db674d8e93a03d814fa0ada70731efe8a4b9",
  ],
  146: [
    // sonic
    "0xbe27993204ec64238f71a527b4c4d5f4949034c3",
  ],
  8453: [
    // base
    "0x727cEbAcfb10fFd353Fc221D06A862B437eC1735",
    "0xe15578523937ed7f08e8f7a1fa8a021e07025a08",
    "0x14936c9b8eb798ca6291c2d6ce5de2c6cb5f1f9c",
    "0x3124d41708edbdc7995a55183e802e3d9d0d5ef1",
    "0x5d746848005507da0b1717c137a10c30ad9ee307",
  ],
  42161: [
    // arbitrum
    "0x86aacbed3e7b3d33149d5dcfd2def3c6d8498b8b",
    "0xb6cfcf89a7b22988bfc96632ac2a9d6dab60d641",
    "0x5402b5f40310bded796c7d0f3ff6683f5c0cffdf",
    "0xb7ffe52ea584d2169ae66e7f0423574a5e15056f"
  ],
};

export async function getApiPrices(timestamp: number) {
  if (timestamp != 0) return;
  const writes: Write[] = [];

  await Promise.all(
    Object.keys(allAssets).map(async (chainId: string) => {
      try {
        let addressesString: string = "";
        allAssets[chainId].map(
          (asset: string, i: number) =>
            (addressesString += `${i == 0 ? "" : ","}${asset}`),
        );

        const { prices } = await fetch(
          `https://api-v2.pendle.finance/core/v1/${chainId}/assets/prices?addresses=${addressesString}&skip=0`,
        ).then((r) => r.json());

        const metadatas = await fetch(
          `https://api-v2.pendle.finance/core/v3/${chainId}/assets/all`,
        ).then((r) => r.json());

        Object.keys(prices).map((address: string) => {
          const metadata = metadatas.assets.find(
            (m: Asset) => (m.address = address.toLowerCase()),
          );
          if (!metadata) return;
          const { decimals, symbol } = metadata;

          addToDBWritesList(
            writes,
            chainIdMap[Number(chainId)],
            address,
            prices[address],
            decimals,
            symbol,
            timestamp,
            "pendle-api",
            0.5,
          );
        });
      } catch (e) {
        throw new Error(`Pendle API adapter failed with: ${e}`);
      }
    }),
  );

  return writes;
}
