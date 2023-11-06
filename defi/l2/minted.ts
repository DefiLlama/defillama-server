import { getCurrentUnixTimestamp } from "../src/utils/date";
import { getPrices } from "../dimension-adapters/utils/prices";
import { fetchTokenDeployers, fetchTokenOwnerLogs } from "./layer2pg";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";
import deployers from "./bridgeDeployers";
import { multiCall } from "@defillama/sdk/build/abi/abi2";

const zero = BigNumber(0);
type SupplyData = {
  total?: number;
  bridged: number;
};
export default async function main(params: { chain: Chain; timestamp?: number; searchWidth?: number }) {
  const chain = params.chain;
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const allTokens: string[] = []; // blah blah];
  const bridgeContracts: string[] = (await fetchTokenOwnerLogs(chain, 1699285022)).map((t: any) => t.holder);
  bridgeContracts.push(...deployers[chain]);

  const tokenDeployers: { [token: string]: string } = await fetchTokenDeployers(chain);
  const mintedTokens: { [token: string]: SupplyData } = {};
  allTokens.map(async (token: string) => {
    let deployer = tokenDeployers[token];
    if (!deployer) deployer = await findUnknownTokenDeployer(token, chain);
    if (bridgeContracts.includes(deployer)) return;
    const outgoingBalances = await multiCall({
      chain,
      calls: bridgeContracts.map((params: string) => ({
        target: token,
        params,
      })),
      abi: "erc20:balanceOf",
    });
    const bridged = outgoingBalances.reduce((p: number, c: number) => BigNumber(c).plus(p), zero);
    mintedTokens[token] = { bridged };
  });

  const supplies = await multiCall({
    chain,
    calls: Object.keys(mintedTokens).map((target: string) => ({
      target,
    })),
    abi: "erc20:totalSupply",
  });

  Object.keys(mintedTokens).map((t: string, i: number) => {
    mintedTokens[t].total = supplies[i];
  });

  const prices = await getPrices(
    Object.keys(mintedTokens).map((t: string) => `${chain}:${t}`),
    timestamp
  );

  const mintedAssets: { [asset: string]: BigNumber } = {};
  Object.keys(mintedTokens).map((t: string) => {
    const priceInfo = prices[`${chain}:${t}`];
    const supplyData = mintedTokens[t];
    if (!priceInfo) return;
    if (!supplyData.total) return;
    const onChainSupply = supplyData.total - supplyData.bridged;
    if (!(priceInfo.symbol in mintedAssets)) mintedAssets[priceInfo.symbol] = zero;
    const decimalShift: BigNumber = BigNumber(10).pow(BigNumber(priceInfo.decimals));
    const usdValue: BigNumber = BigNumber(priceInfo.price).times(BigNumber(onChainSupply)).div(decimalShift);
    mintedAssets[priceInfo.symbol] = BigNumber(usdValue).plus(mintedAssets[priceInfo.symbol]);
  });

  return;
}
async function findUnknownTokenDeployer(token: string, chain: Chain) {
  chain;
  return token;
}
main({ chain: "ethereum" }); // ts-node defi/l2/bridged.ts
