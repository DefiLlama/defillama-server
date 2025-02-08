import { getCurrentUnixTimestamp } from "../../utils/date";
import {
  addToDBWritesList,
  getTokenAndRedirectDataMap,
} from "../utils/database";
import { Write } from "../utils/dbInterfaces";
import { getTokenInfo } from "../utils/erc20";
import { getApi } from "../utils/sdk";

const target: string = "0x5261c5A5f08818c08Ed0Eb036d9575bA1E02c1d6";
const chain: string = "berachain";

export async function kodiak(timestamp: number = 0): Promise<Write[]> {
  const api = await getApi(
    chain,
    timestamp == 0 ? getCurrentUnixTimestamp() : timestamp,
  );

  const deployers: string[] = await api.call({
    target,
    abi: "address[]:getDeployers",
  });

  const islands: string[] = (
    await api.multiCall({
      abi: "function getIslands(address) view returns (address[])",
      calls: deployers,
      target,
    })
  ).flat();

  const [token0s, token1s, balances, infos] = await Promise.all([
    api.multiCall({
      abi: "address:token0",
      calls: islands.map((target: string) => ({ target })),
    }),
    api.multiCall({
      abi: "address:token1",
      calls: islands.map((target: string) => ({ target })),
    }),
    api.multiCall({
      abi: "uint256:getUnderlyingBalances",
      calls: islands.map((target: string) => ({ target })),
    }),
    getTokenInfo(chain, islands, undefined, { withSupply: true }),
  ]);

  const underlyingData = await getTokenAndRedirectDataMap(
    [...new Set([...token0s, ...token1s])],
    chain,
    timestamp,
  );

  function tokenAum(
    token: string,
    balance: number,
  ): { aum: number; confidence: number } {
    const tokenData = underlyingData[token.toLowerCase()];
    if (!tokenData) return { aum: NaN, confidence: NaN };
    return {
      aum: (tokenData.price * balance) / 10 ** tokenData.decimals,
      confidence: tokenData.confidence ?? 0.6,
    };
  }

  const writes: Write[] = [];
  islands.map((p: string, i: number) => {
    const decimals = infos.decimals[i].output;
    const supply = infos.supplies[i].output;
    if (supply == "0") return;

    const token0 = tokenAum(token0s[i], balances[i]);
    const token1 = tokenAum(token1s[i], balances[i]);
    if ([token0.aum, token1.aum].includes(NaN)) return;

    const price =
      (token0.aum + token1.aum) / (infos.supplies[i].output / 10 ** decimals);

    addToDBWritesList(
      writes,
      chain,
      p,
      price,
      decimals,
      infos.symbols[i].output,
      timestamp,
      "kodiak",
      Math.min(0.9, token0.confidence, token1.confidence),
    );
  });

  return writes;
}
