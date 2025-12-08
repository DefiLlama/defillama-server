import { runInPromisePool } from "@defillama/sdk/build/generalUtil";
import { getApi } from "../utils/sdk";
import { getCurrentUnixTimestamp } from "../../utils/date";
import { Write } from "../utils/dbInterfaces";
import { addToDBWritesList } from "../utils/database";
import { getTokenInfoMap } from "../utils/erc20";
import { request } from "@defillama/sdk/build/util/graph";
import { getConfig } from "../../utils/cache";

type VaultDatas = {
  [vault: string]: {
    totalAssets: number;
    positions: any[];
    markets: string[];
  };
};

const listaConfig: { [chain: string]: { vault: string; vaultInfo: string } } = {
  bsc: {
    vault: "0x8F73b65B4caAf64FBA2aF91cC5D4a2A1318E5D8C",
    vaultInfo:
      "https://api.lista.org/api/moolah/vault/list?page=1&pageSize=1000",
  },
  ethereum: {
    vault: "0xf820fB4680712CD7263a0D3D024D5b5aEA82Fd70",
    vaultInfo:
      "https://api.lista.org/api/moolah/vault/list?page=1&pageSize=1000&chain=ethereum",
  },
};

async function fetchMorphoVaultAddresses(chainId: string) {
  let assets: { [vault: string]: string } = {};
  let skip = 0;
  let length = 1000;

  while (length == 1000) {
    const query = `
        query {
            vaults (first: ${length}, skip: ${skip}, orderBy: Address, where:  {
                chainId_in: [${chainId}]
            }) {
                items {
                    asset {
                        address
                    }
                    address
                }
            }}`;

    const res = await request("https://api.morpho.org/graphql", query, { cache: true, cacheKey: `morpho-vaults-${skip}` });
    res.vaults.items.forEach((item: any) => {
      assets[item.address.toLowerCase()] = item.asset.address.toLowerCase();
    });
    length = res.vaults.items.length;
    skip += length;
  }

  return assets;
}

async function morpho(
  timestamp: number = 0,
  vaultAssets: { [vault: string]: string } = {},
  api: any,
  target: string
) {
  const threeDaysAgo =
    (timestamp == 0 ? getCurrentUnixTimestamp() : timestamp) - 3 * 24 * 60 * 60;
  const threeDaysAgoApi = await getApi(api.chain, threeDaysAgo);

  if (!api.chainId) throw new Error("Chain ID not found");
  const allMarkets: string[] = [];
  const currentVaultDatas: VaultDatas = {};
  const previousVaultDatas: VaultDatas = {};

  await runInPromisePool({
    items: Object.keys(vaultAssets),
    concurrency: 5,
    processor: (vault: string) => fetchVaultPositions(vault, api, true),
  });

  await runInPromisePool({
    items: Object.keys(vaultAssets),
    concurrency: 5,
    processor: (vault: string) => fetchVaultPositions(vault, threeDaysAgoApi, false),
  });

  async function fetchVaultPositions(vault: string, api: any, isCurrent: boolean) {
    const totalAssets = await api.call({
      target: vault,
      abi: "uint256:totalAssets",
      permitFailure: true,
    });

    const withdrawQueueLength = await api.call({
      target: vault,
      abi: "uint256:withdrawQueueLength",
      permitFailure: true,
    });

    const markets = await api.multiCall({
      target: vault,
      abi: "function withdrawQueue(uint256 index) view returns (bytes32)",
      calls: Array.from({ length: withdrawQueueLength }, (_, i) => ({
        params: i,
      })),
      permitFailure: true,
    });

    // vaults position in market
    const positions = await api.multiCall({
      target,
      abi: "function position(bytes32, address) view returns (uint256 supplyShares, uint128 borrowShares, uint128 collateral)",
      calls: markets.map((market: string) => ({
        params: [market, vault],
      })),
      permitFailure: true,
    });

    allMarkets.push(...markets);
    isCurrent
      ? (currentVaultDatas[vault] = { totalAssets, positions, markets })
      : (previousVaultDatas[vault] = { totalAssets, positions, markets });
  }

  const uniqueMarkets = [...new Set(allMarkets)];
  const [currentMarketData, previousMarketData] = await Promise.all([
    fetchMarketData(api),
    fetchMarketData(threeDaysAgoApi),
  ]);

  async function fetchMarketData(api: any) {
    const marketDataArray = await api.multiCall({
      target,
      abi: "function market(bytes32) view returns (uint128 totalSupplyAssets, uint128 totalSupplyShares, uint128 totalBorrowAssets, uint128 totalBorrowShares, uint128 lastUpdate, uint128 fee)",
      calls: uniqueMarkets.map((market: string) => ({ params: market })),
      permitFailure: true,
    });
    const marketData: {
      [market: string]: {
        totalSupplyAssets: number;
        totalSupplyShares: number;
        totalBorrowAssets: number;
      };
    } = {};
    marketDataArray.forEach((m: any, i: number) => {
      marketData[uniqueMarkets[i]] = m;
    });

    return marketData;
  }

  const currentTotalWithdrawables = aggregateWithdrawable(
    currentVaultDatas,
    currentMarketData
  );
  const previousTotalWithdrawables = aggregateWithdrawable(
    previousVaultDatas,
    previousMarketData
  );

  function aggregateWithdrawable(vaultDatas: VaultDatas, marketData: any) {
    let totalWithdrawables: { [vault: string]: number } = {};
    Object.keys(vaultDatas).map((vault: string) => {
      totalWithdrawables[vault] = 0;
      const { positions, markets } = vaultDatas[vault];

      markets.map((market: string, i: number) => {
        const { totalSupplyAssets, totalSupplyShares, totalBorrowAssets } =
          marketData[market];
        if (positions[i].supplyShares == 0) return;
        const supplyAssets =
          (positions[i].supplyShares * totalSupplyAssets) / totalSupplyShares;

        const availableLiquidity = Math.max(
          totalSupplyAssets - totalBorrowAssets,
          0
        );

        const withdrawable = Math.min(supplyAssets, availableLiquidity);

        totalWithdrawables[vault] += Number(withdrawable);
      });
    });

    return totalWithdrawables;
  }

  const problemVaultList: string[] = [];
  Object.keys(currentVaultDatas).map((vault: string) => {
    const { totalAssets } = currentVaultDatas[vault];
    if (totalAssets == 0) return;

    const currentWithdrawable = currentTotalWithdrawables[vault];
    const previousWithdrawable = previousTotalWithdrawables[vault];
    if (currentWithdrawable / totalAssets > 0.01) return;

    if (!previousVaultDatas[vault]) {
      if (currentWithdrawable / totalAssets < 0.01)
        console.log(
          `Bad debt in vault ${vault} on ${api.chain}: ${((currentWithdrawable / totalAssets) * 100).toFixed(2)}% liquidity`
        );

      problemVaultList.push(vault);
      return;
    }

    const { totalAssets: previousTotalAssets } = previousVaultDatas[vault];
    if (
      previousWithdrawable &&
      previousWithdrawable / previousTotalAssets > 0.01
    )
      return;

    problemVaultList.push(vault);
    console.log(
      `Bad debt in vault ${vault} on ${api.chain}: ${((currentWithdrawable / totalAssets) * 100).toFixed(2)}% liquidity`
    );
  });

  const metadata = await getTokenInfoMap(api.chain, problemVaultList);

  const writes: Write[] = [];
  problemVaultList.forEach(async (vault: string) => {
    const { symbol, decimals } = metadata[vault];
    if (!symbol || !decimals) return;
    addToDBWritesList(
      writes,
      api.chain,
      vault,
      0,
      decimals,
      symbol,
      timestamp,
      "morpho",
      1.01
    );
  });

  return writes;
}

async function getListaVaults(chain: string) {
  const {
    data: { list: vaults },
  } = await getConfig('lista-lend-vaults', listaConfig[chain].vaultInfo)
  const listaVaults: { [vault: string]: string } = {};
  vaults.map(
    (vault: any) =>
      (listaVaults[vault.address.toLowerCase()] = vault.asset.toLowerCase())
  );
  return listaVaults;
}

async function lista(timestamp: number = 0) {
  return await Promise.all(
    Object.keys(listaConfig).map(async (chain) => {
      const api = await getApi(chain, timestamp);
      const vaults = await getListaVaults(chain);
      return await morpho(timestamp, vaults, api, listaConfig[chain].vault);
    })
  );
}

export async function morphoBlue(timestamp: number = 0) {
  const chains = ["ethereum", "base", "hyperliquid", "katana", "arbitrum", "wc", "unichain", "polygon", "optimism", "plume_mainnet", "sei", "lisk", "etlk"];
  return await Promise.all(
    chains.map(async (chain) => {
      const api = await getApi(chain, timestamp);
      if (!api.chainId) return;
      const vaults = await fetchMorphoVaultAddresses(api.chainId.toString());
      return await morpho(
        timestamp,
        vaults,
        api,
        "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb"
      );
    })
  );
}

export const adapters = {
  // morphoBlue,
  lista,
} as any;
