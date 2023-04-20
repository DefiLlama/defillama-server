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

const tokens: string[] = [
  "0x43a502d7e947c8a2ebbaf7627e104ddcc253abc6",
  "0x4186eb285b1efdf372ac5896a08c346c7e373cc4",
  "0x2680b58945a31602e4b6122c965c2849eb76dd3b",
  "0x337b4b933d60f40cb57dd19ae834af103f049810"
];

export default async function getTokenPrices(chain: any, timestamp: number) {
  const block: number | undefined = await getBlock(chain, timestamp);

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
