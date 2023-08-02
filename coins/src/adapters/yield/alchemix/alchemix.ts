import { multiCall } from "@defillama/sdk/build/abi/index";
import abi from "./abi.json";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write, CoinData } from "../../utils/dbInterfaces";
import { Result } from "../../utils/sdkInterfaces";
import getBlock from "../../utils/block";

const tokensByChain = {
  optimism: [
    "0x43a502d7e947c8a2ebbaf7627e104ddcc253abc6",
    "0x4186eb285b1efdf372ac5896a08c346c7e373cc4",
    "0x2680b58945a31602e4b6122c965c2849eb76dd3b",
    "0x337b4b933d60f40cb57dd19ae834af103f049810"
  ],
  xdai: [
    '0x6d9dc1282b9e25a91b266b6b61ef65a38f949f22',
    '0x01ac9005f8446af28b065af87216b85faac5f6e2',
    '0xc1593302979e5e8e16e53c3303bf99ffa319d314',
    '0x110e2d3d4c94596f5698c753d5cd43221d3ec78b',
    '0x20e5eb701e8d711d419d444814308f8c2243461f',
    '0x3d938f90ac251c1bcf6b4e399dd72c8c685a9bbc',
  ],
  avax: [
    '0xe7839ea8ea8543c7f5d9c9d7269c661904729fe7',
    '0x759a2e28d4c3ad394d3125d5ab75a6a5d6782fd9',
    '0xa291ae608d8854cdbf9838e28e9badcf10181669'
  ]
} as {
  [chain:string]:string[]
};

export default async function getTokenPrices(chain: any, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const tokens = tokensByChain[chain]

  let ratios: Result[];
  let aTokens: Result[];
  [{ output: ratios }, { output: aTokens }] = await Promise.all([
    multiCall({
      calls: tokens.map((t: string) => ({
        target: t,
        params: ["1000000000000000000"]
      })),
      chain,
      block,
      abi: abi.staticToDynamicAmount
    }),
    multiCall({
      calls: tokens.map((t: string) => ({
        target: t
      })),
      chain,
      block,
      abi: abi.aToken
    })
  ]);

  let underlyingInfos: CoinData[];
  let tokenInfos: any;
  [underlyingInfos, tokenInfos] = await Promise.all([
    getTokenAndRedirectData(
      aTokens.map((t: Result) => t.output.toLowerCase()),
      chain,
      timestamp
    ),
    getTokenInfo(
      chain,
      aTokens.map((t: Result) => t.output),
      block,
    )
  ]);

  const writes: Write[] = [];
  aTokens.map((a: Result, i: number) => {
    const underlyingInfo: CoinData | undefined = underlyingInfos.find(
      (i: CoinData) => i.address == a.output.toLowerCase()
    );
    if (underlyingInfo == null) return;

    const price: number = (ratios[i].output * underlyingInfo.price) / 10 ** 18;

    addToDBWritesList(
      writes,
      chain,
      a.input.target.toLowerCase(),
      price,
      tokenInfos.decimals[i].output,
      tokenInfos.symbols[i].output,
      timestamp,
      "alchemix",
      1
    );
  });

  return writes;
}
