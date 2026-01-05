import * as sdk from "@defillama/sdk";
import { request, gql } from "graphql-request";
import { addToDBWritesList, getTokenAndRedirectDataMap } from "../../utils/database";
import { multiCall } from "@defillama/sdk/build/abi/index";
import { Write } from "../../utils/dbInterfaces";

// Gets all vaults
const query = gql`
query AllVaults($skip: Int) {
  vaults(first: 1000, skip: $skip) {
    id
    isWhitelisted
    strategyType
    vaultToken {
      symbol
      decimals
    }
    yieldToken {
      id
      decimals
    }
    asset {
      id
      decimals
    }
  }
}
`;

const subgraphURL: {
  [key: string]: string
} = {
  ethereum: sdk.graph.modifyEndpoint("9fw42E6QrezaPxixKN9H79nWmpVWURkLmcJdgGHyC14B")
  // ethereum: "https://api.studio.thegraph.com/query/60626/notional-exponent/version/latest"
}

async function getVaults(subgraphURL: string) {
  const results: {
    id: string
    isWhitelisted: boolean
    strategyType: string
    vaultToken: {
      symbol: string
      decimals: number
    }
    yieldToken: {
      id: string
      decimals: number
    }
    asset: {
      id: string
      decimals: number
    }
  }[] = [];
  let skip = 0
  let hasMore = true
  while (hasMore) {
    const { vaults } = await request<{ vaults: typeof results }>(subgraphURL, query, { skip })
    results.push(...vaults)
    skip += 1000
    hasMore = vaults.length === 1000
  }

  return results
}

async function getYieldTokens(chain: string, vaults: Awaited<ReturnType<typeof getVaults>>) {
  const yieldTokens = await multiCall({
    chain,
    calls: vaults.filter((vault) => vault.strategyType === "CurveConvex2Token").map((vault) => ({
      target: vault.id,
    })),
    abi: "function CURVE_POOL_TOKEN() view returns (address)",
  })

  return vaults.map((v) => {
    return {
      vault: v.id,
      yieldToken: (yieldTokens.output.find((y: any) => y.input.target === v.id)?.output || v.yieldToken.id).toLowerCase(),
    }
  })
}

async function getVaultPrices(chain: string, vaults: string[]) {
  const prices = await multiCall({
    chain,
    calls: vaults.map((vault) => ({
      target: vault,
    })),
    abi: "function price() view returns (uint256)",
  })
  return prices.output.map((p: { output: string }) => p.output)
}

async function getConvertSharesToYieldTokens(chain: string, vaults: string[]) {
  const convertSharesToYieldTokens = await multiCall({
    chain,
    calls: vaults.map((v) => ({
      target: v,
      params: [BigInt(10) ** BigInt(24)],
    })),
    abi: "function convertSharesToYieldToken(uint256 amount) view returns (uint256)",
  })

  return convertSharesToYieldTokens.output.map((c: { output: string }) => c.output)
}

export default async function getTokenPrices(chain: string, timestamp: number) {
  const vaults = await getVaults(subgraphURL[chain])
  const yieldTokens = await getYieldTokens(chain, vaults)
  const yieldTokenPrices = await getTokenAndRedirectDataMap(yieldTokens.map((y) => y.yieldToken), chain, timestamp)
  const underlyingPrices = await getTokenAndRedirectDataMap(
    vaults.map((vault) => vault.asset.id),
    chain,
    timestamp,
  )
  const sharesPrices = await getConvertSharesToYieldTokens(chain, vaults.map((vault) => vault.id))
  const vaultPrices = await getVaultPrices(chain, vaults.map((vault) => vault.id))

  const writes: Write[] = [];
  vaults.forEach((vault, index) => {
    let price: number;
    const yieldToken = yieldTokens.find((y) => y.vault === vault.id)?.yieldToken
    if (yieldTokenPrices[yieldToken]) {
      // These are the DefiLlama prices for the yield tokens. It should reflect up to date prices for
      // Curve Pool Tokens, PT Tokens and most staking tokens. We just discount it here by the vault shares
      // to yield token price,
      price = yieldTokenPrices[yieldToken].price * sharesPrices[index] / 10 ** (yieldTokenPrices[yieldToken].decimals)
    } else {
      // If the DefiLlama price is not available, we use the on chain vault price.
      const assetDecimals = vault.asset.decimals
      const vaultPrice = vaultPrices[index] / (10 ** (assetDecimals + 12))
      price = vaultPrice * underlyingPrices[vault.asset.id].price
    }

    addToDBWritesList(
      writes,
      chain,
      vault.id,
      price,
      vault.vaultToken.decimals,
      vault.vaultToken.symbol,
      timestamp,
      "notional",
      0.7
    )
  })

  return writes
}