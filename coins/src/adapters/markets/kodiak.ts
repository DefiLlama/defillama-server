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

  const api = await getApi(chain, timestamp);

  const deployers: string[] = await api.call({ target, abi: "address[]:getDeployers", });

  let islands: string[] = (
    await api.multiCall({
      abi: "function getIslands(address) view returns (address[])",
      calls: deployers,
      target,
    })
  ).flat();

  let infoFilters = await api.multiCall({ abi: "function getUnderlyingBalances() view returns (uint256, uint256)", calls: islands, permitFailure: true,})
  islands = islands.filter((_, i) => {
    return infoFilters[i] && !(infoFilters[i][0] === "0" && infoFilters[i][1] === "0");
  });

  const [token0s, token1s, balances, infos] = await Promise.all([
    api.multiCall({ abi: "address:token0", calls: islands, }),
    api.multiCall({ abi: "address:token1", calls: islands, }),
    api.multiCall({ abi: "function getUnderlyingBalances() view returns (uint256, uint256)", calls: islands, }),
    getTokenInfo(chain, islands, undefined, { withSupply: true }),
  ]);

  const underlyingData = await getTokenAndRedirectDataMap(
    [...new Set([...token0s, ...token1s].map(i => i.toLowerCase()))],
    chain,
    timestamp,
  );

  function tokenAum(
    token: string,
    balance: number,
  ): { aum: number; confidence: number } | undefined {
    const tokenData = underlyingData[token.toLowerCase()]
    if (!tokenData) return;
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

    const token0 = tokenAum(token0s[i], balances[i][0]);
    const token1 = tokenAum(token1s[i], balances[i][1]);
    if (!token0 || !token1) return;

    const price = (token0.aum + token1.aum) / (infos.supplies[i].output / 10 ** decimals);

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

  return writes
}
