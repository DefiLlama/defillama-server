import { multiCall } from "@defillama/sdk/build/abi";
import getBlock from "../../utils/block";
import addresses from "./addresses.json";
import { Chain } from "@defillama/sdk/build/general";
import { Result } from "./../../utils/sdkInterfaces";
import { getTokenAndRedirectData } from "../../utils/database";
import { getTokenInfo } from "../../utils/erc20";

const abi = {
  getVirtualPrice: {
    inputs: [],
    name: "getVirtualPrice",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  getToken: {
    inputs: [{ internalType: "uint8", name: "index", type: "uint8" }],
    name: "getToken",
    outputs: [{ internalType: "contract IERC20", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  }
};
export default async function getTokenPrices(timestamp: number, chain: Chain) {
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

  const hTokenAddresses: string[] = (
    await multiCall({
      abi: abi.getToken,
      calls: virtualPrices.map((r: Result) => ({
        target: r.input.target,
        params: [0]
      })),
      block,
      chain
    })
  ).output.map((r: Result) => r.output);

  const underlyingTokenInfo = await getTokenAndRedirectData(
    hTokenAddresses,
    chain,
    timestamp
  );

  const hTokenInfo = await getTokenInfo(chain, hTokenAddresses, block);

  return;
}
getTokenPrices(0, "polygon");
// ts-node coins/src/adapters/markets/hop/hop.ts
