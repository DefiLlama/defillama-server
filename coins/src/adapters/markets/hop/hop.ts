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
  hToken: string;
  underlying: string;
};
async function getTokenAddressMap(
  chain: any,
  block: number | undefined,
  virtualPrices: Result[]
): Promise<map[]> {
  let hTokenResults: Result[];
  let underlyingResults: Result[];
  [
    { output: hTokenResults },
    { output: underlyingResults }
  ] = await Promise.all([
    multiCall({
      abi: abi.getToken,
      calls: virtualPrices.map((r: Result) => ({
        target: r.input.target,
        params: [1]
      })),
      block,
      chain
    }),
    multiCall({
      abi: abi.getToken,
      calls: virtualPrices.map((r: Result) => ({
        target: r.input.target,
        params: [0]
      })),
      block,
      chain
    })
  ]);

  const hTokenAddresses: string[] = hTokenResults.map((h) =>
    h.output.toLowerCase()
  );
  const underlyingAddresses: string[] = underlyingResults.map((u) =>
    u.output.toLowerCase()
  );

  return hTokenAddresses.map((hToken: string, i: number) => ({
    hToken,
    underlying: underlyingAddresses[i]
  }));
}
function formWrites(
  chain: any,
  timestamp: number,
  hTokenInfos: any,
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
      m.hToken,
      price,
      hTokenInfos.decimals[i].output,
      hTokenInfos.symbols[i].output,
      timestamp,
      "hop",
      0.9
    );
  });

  return writes;
}
export default async function getTokenPrices(timestamp: number, chain: any) {
  const block: number | undefined = await getBlock(chain, timestamp);
  const calls: any[] = [];

  Object.keys(addresses.bridges).map((coin: string) => {
    const l2Chains = addresses.bridges[coin as keyof typeof addresses.bridges];
    const contracts: { [contract: string]: string | number } =
      l2Chains[chain as keyof typeof l2Chains];
    if (contracts != undefined) calls.push({ target: contracts.l2SaddleSwap });
  });

  const virtualPrices: Result[] = (
    await multiCall({ abi: abi.getVirtualPrice, calls, block, chain })
  ).output.filter((r: Result) => r.success == true);

  const addressMap = await getTokenAddressMap(chain, block, virtualPrices);

  const [underlyingTokenInfos, hTokenInfos] = await Promise.all([
    getTokenAndRedirectData(
      addressMap.map((m) => m.underlying),
      chain,
      timestamp
    ),
    getTokenInfo(
      chain,
      addressMap.map((m) => m.hToken),
      block
    )
  ]);

  return formWrites(
    chain,
    timestamp,
    hTokenInfos,
    virtualPrices,
    addressMap,
    underlyingTokenInfos
  );
}
