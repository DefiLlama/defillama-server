import protocols, { Protocol } from "../src/protocols/data";
import getTVLOfRecordClosestToTimestamp from "../src/utils/shared/getRecordClosestToTimestamp";
import { getCurrentUnixTimestamp } from "../../high-usage/defiCode/utils/date";
import { Chain } from "@defillama/sdk/build/general";
import BigNumber from "bignumber.js";

const excludedTvlKeys = ["PK", "SK", "tvl"];
const zero = BigNumber(0);
type TokenTvlData = {
  [chain: Chain]: { [asset: string]: BigNumber };
};

function aggregateChainTokenBalances(usdTokenBalances: TokenTvlData[][]): TokenTvlData {
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

async function fetchBridgeUsdTokenTvls(timestamp: number, searchWidth: number): Promise<TokenTvlData[]> {
  const bridgeProtocols: Protocol[] = protocols
    .filter((p: Protocol) => p.category?.toLowerCase() == "bridge")
    .slice(0, 5);
  const usdTokenBalances: TokenTvlData[] = await Promise.all(
    bridgeProtocols.map((b: Protocol) =>
      getTVLOfRecordClosestToTimestamp(`hourlyUsdTokensTvl#${b.id}`, timestamp, searchWidth)
    )
  );

  const missingProtocolTvlsLength = bridgeProtocols.length - usdTokenBalances.length;
  if (missingProtocolTvlsLength) throw new Error(`missing hourlyUsdTokensTvl for ${missingProtocolTvlsLength} bridges`);

  return usdTokenBalances;
}

function generateChainStats(chainTvls: TokenTvlData): void {
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

async function fetchNativeMintedBalances(): Promise<TokenTvlData[]> {
  return [{}];
}

export default async function tvl(params: { timestamp?: number; searchWidth?: number } = {}) {
  const timestamp: number = params.timestamp ?? getCurrentUnixTimestamp();
  const bridgeTokenBalances = await fetchBridgeUsdTokenTvls(timestamp, params.searchWidth ?? 10800); // 3hr either side
  const nativeMintedBalances = await fetchNativeMintedBalances();
  const aggregatedTokenBalances = aggregateChainTokenBalances([bridgeTokenBalances, nativeMintedBalances]);
  const chainStats = generateChainStats(aggregatedTokenBalances);
  return chainStats;
}
