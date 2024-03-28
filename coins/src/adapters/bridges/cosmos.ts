import { Token } from "./index";
// import * as cosmosAdapter from "../../../../defi/DefiLlama-Adapters/projects/helper/chain/cosmos"
// import * as tokenMapping from "../../../../defi/DefiLlama-Adapters/projects/helper/tokenMapping"
import { fetch, } from "../utils";

const skipChains = ['ibc', 'terra', 'terra2']
const includeChains = ['quasar', 'chihuahua',]

const gitEndpoint = 'https://raw.githubusercontent.com/cosmostation/chainlist/main/chain'

export default async function bridge(): Promise<Token[]> {
  // const cosmosChainsSet = new Set([...Object.keys(cosmosAdapter.endPoints), ...tokenMapping.ibcChains, ...includeChains])
  const cosmosChainsSet = new Set([...includeChains, ...[
    "kujira", "migaloo", "xpla", "kava", 'crescent', 'osmosis', 'stargaze', 'juno', 'injective', 'cosmos', 'comdex', 'stargaze', 'umee', 'persistence', 'neutron', 'gravitybridge',
    "archway", "bostrom",
  ]])
  const chainMapping: any = {
    'gravitybridge': 'gravity-bridge'
  }
  skipChains.forEach(chain => cosmosChainsSet.delete(chain))
  const items: any = {}
  const supportedChains: any = await fetch(`${gitEndpoint}/supports.json`)
  const supportedChainsSet = new Set(supportedChains)

  for (const chain of cosmosChainsSet) {
    if (!supportedChainsSet.has(chainMapping[chain] ?? chain) && !['migaloo'].includes(chain)) {
      console.log('Not yet supported by cosmostation:', chain)
      continue
    }
    try {
      const assets: any = await fetch(`${gitEndpoint}/${chainMapping[chain] ?? chain}/assets.json`)
      assets.map(({ decimals, symbol, denom, type: assetType, coinGeckoId, counter_party, contract, origin_chain, origin_denom, }: any) => {
        if (typeof decimals !== 'number') return;

        let from = `${chain}:${denom}`

        if (['ibc', 'bridge'].includes(assetType)) {
          if (!denom.startsWith('ibc/')) {
            // console.log('Not ibc denom:', denom)
          } else {
            denom = denom.slice(4)
            from = `ibc:${denom}`
          }
        }
        from = from.replace(/\//g, ':')
        if (coinGeckoId && coinGeckoId.length) {
          items[from] = {
            symbol,
            decimals,
            from,
            to: `coingecko#${coinGeckoId}`,
          }
        } else if (counter_party) {
          items[from] = {
            symbol,
            decimals,
            from,
            to: `${origin_chain}:${contract ? contract : origin_denom}`.replace(/\//g, ':'),
          }
        }
      })
    } catch (e) {
      console.error('Error fetching chain:', chain, e)
    }
  }

  const tokens: Token[] = Object.values(items)
  // console.table(tokens)
  return tokens
}

// bridge()
