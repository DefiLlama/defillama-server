import BigNumber from "bignumber.js";
import { TokenTvlData } from "./types";
import { excludedTvlKeys, zero } from "./constants";

export function generateChainStats(chainTvls: TokenTvlData): void {
  let totalTvl: BigNumber = zero;
  // total chain Tvl
  Object.keys(chainTvls).map((chain: string) => {
    const totalChainTvl = Object.values(chainTvls[chain]).reduce((p: BigNumber, c: BigNumber) => p.plus(c), zero);
    chainTvls[chain].tvl = totalChainTvl;
    totalTvl = totalTvl.plus(totalChainTvl);
  });

  // dominance
  Object.keys(chainTvls).map((chain: string) => {
    chainTvls[chain].dominance = chainTvls[chain].tvl.div(totalTvl);
  });
}

export function aggregateChainTokenBalances(usdTokenBalances: TokenTvlData[][]): TokenTvlData {
  const chainUsdTokenTvls: TokenTvlData = {};

  usdTokenBalances.map((type: TokenTvlData[]) =>
    type.map((bridge: any) => {
      Object.keys(bridge).map((chain: string) => {
        if (excludedTvlKeys.includes(chain)) return;
        if (!(chain in chainUsdTokenTvls)) chainUsdTokenTvls[chain] = {};
        Object.keys(bridge[chain]).map((asset: string) => {
          if (!(asset in chainUsdTokenTvls[chain])) chainUsdTokenTvls[chain][asset] = zero;
          chainUsdTokenTvls[chain][asset] = BigNumber(bridge[chain][asset]).plus(chainUsdTokenTvls[chain][asset]);
        });
      });
    })
  );

  return chainUsdTokenTvls;
}
