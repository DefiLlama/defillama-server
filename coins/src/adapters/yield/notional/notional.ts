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
  ethereum: "https://api.studio.thegraph.com/query/60626/notional-exponent/version/latest",
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

export async function getVaultPrices(chain: string, vaults: string[]) {
  const prices = await multiCall({
    chain,
    calls: vaults.map((vault) => ({
      target: vault,
    })),
    abi: "function price() view returns (uint256)",
  })
  return prices.output.map((p: { output: string }) => p.output)
}

export default async function getTokenPrices(chain: string, timestamp: number) {
  const vaults = await getVaults(subgraphURL[chain])
  const underlyingPrices = await getTokenAndRedirectDataMap(
    vaults.map((vault) => vault.asset.id),
    chain,
    timestamp,
  )
  const vaultPrices = await getVaultPrices(chain, vaults.map((vault) => vault.id))
  const writes: Write[] = [];
  vaults.forEach((vault, index) => {
    const assetDecimals = vault.asset.decimals
    const vaultPrice = vaultPrices[index] / (10 ** (assetDecimals + 12))
    const price = vaultPrice * underlyingPrices[vault.asset.id].price
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