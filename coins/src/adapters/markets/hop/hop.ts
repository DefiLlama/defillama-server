import { multiCall } from "@defillama/sdk/build/abi";
import getBlock from "../../utils/block";
import { Result } from "./../../utils/sdkInterfaces";
import {
  addToDBWritesList,
  getTokenAndRedirectData
} from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";
import { Write } from "../../utils/dbInterfaces";
import abi from "./abi.json";
import addresses from "./addresses.json";

type map = {
  lp: string;
  underlying: string;
};
async function getTokenAddressMap(
  chain: any,
  block: number | undefined,
  virtualPrices: Result[],
  addresses: any
): Promise<map[]> {
  const underlyingResults: Result[] = (
    await multiCall({
      abi: abi.getToken,
      calls: virtualPrices.map((r: Result) => ({
        target: r.input.target,
        params: [0]
      })),
      block,
      chain
    })
  ).output;

  return underlyingResults.map((u: Result) => ({
    lp: addresses.find((l: any) => u.input.target == l.target).lp.toLowerCase(),
    underlying: u.output.toLowerCase()
  }));
}
function formWrites(
  chain: any,
  timestamp: number,
  lpInfos: any,
  virtualPrices: Result[],
  addressMap: map[],
  underlyingTokenInfos: any[]
): Write[] {
  const writes: Write[] = [];
  addressMap.map((m: any, i: number) => {
    if (Object.values(m).includes(null) || Number(virtualPrices[i].output) == 0)
      return;
    const underlyingInfo = underlyingTokenInfos.find(
      (u) => u.address == m.underlying
    );
    if (underlyingInfo == null) return;
    const price = (underlyingInfo.price * virtualPrices[i].output) / 10 ** 18;

    addToDBWritesList(
      writes,
      chain,
      m.lp,
      price,
      lpInfos.decimals[i].output,
      lpInfos.symbols[i].output,
      timestamp,
      "hop",
      0.9
    );
  });

  return writes;
}
export default async function getTokenPrices(timestamp: number, chain: any) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const correspondingContracts: any[] = [];

  Object.keys(addresses.bridges).map((coin: string) => {
    const indexingChain = chain == "xdai" ? "gnosis" : chain;
    const l2Chains = addresses.bridges[coin as keyof typeof addresses.bridges];
    const contracts: { [contract: string]: string | number } =
      l2Chains[indexingChain as keyof typeof l2Chains];
    if (contracts != undefined)
      correspondingContracts.push({
        target: contracts.l2SaddleSwap,
        lp: contracts.l2SaddleLpToken
      });
  });

  const virtualPrices: Result[] = (
    await multiCall({
      abi: abi.getVirtualPrice,
      calls: correspondingContracts.map((c) => ({ target: c.target })),
      block,
      chain
    })
  ).output.filter((r: Result) => r.success == true);

  const addressMap = await getTokenAddressMap(
    chain,
    block,
    virtualPrices,
    correspondingContracts
  );

  const [underlyingTokenInfos, lpInfos] = await Promise.all([
    getTokenAndRedirectData(
      addressMap.map((m) => m.underlying),
      chain,
      timestamp
    ),
    getTokenInfo(
      chain,
      addressMap.map((m) => m.lp),
      block
    )
  ]);

  return formWrites(
    chain,
    timestamp,
    lpInfos,
    virtualPrices,
    addressMap,
    underlyingTokenInfos
  );
}
