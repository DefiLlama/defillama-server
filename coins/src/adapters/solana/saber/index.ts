
import { Write, CoinData, } from "../../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../../utils/database";
import { getConfig, } from "../../../utils/cache";
import { getTokenAccountBalances, getTokenSupplies, } from "..//utils";

export function saber(timestamp: number) {
  console.log("starting saber");
  return getTokenPrices(timestamp);
}
const chain = 'solana'

async function getTokenPrices(timestamp: number) {

  const writes: Write[] = [];
  const pools = await getConfig('solana/saber-pools', 'https://registry.saber.so/data/llama.mainnet.json')
  const tokenInfo: any[] = pools.map((i: any) => ({
    token: i.lpMint,
    timestamp,
  }))

  let underlyings: any = new Set(pools.map((i: any) => [i.tokenA, i.tokenB]).flat())
  underlyings = [...underlyings]
  const reservesA = pools.map((i: any) => i.reserveA)
  const tokensA = pools.map((i: any) => i.tokenA)
  const tokensB = pools.map((i: any) => i.tokenB)
  const reservesB = pools.map((i: any) => i.reserveB)
  const tokens = pools.map((i: any) => i.lpMint)

  const [tokenData, supplyA, supplyB, coinsData,] = await Promise.all([
    getTokenSupplies(tokens),
    getTokenAccountBalances(reservesA, { individual: true, }),
    getTokenAccountBalances(reservesB, { individual: true, }),
    getTokenAndRedirectData(underlyings, chain, timestamp),
  ])

  const blacklisted = new Set([
    'C9xqJe3gMTUDKidZsZ6jJ7tL9zSLimDUKVpgUbLZnNbi',
    'CASHedBw9NfhsLBXq1WNVfueVznx255j8LLTScto3S6s',
  ])
  tokenData.forEach(({ decimals, amount }: any, i: number) => {
    tokenInfo[i].decimals = decimals
    if (blacklisted.has(tokensA[i]) || blacklisted.has(tokensB[i])) return;

    const dataA: (CoinData | undefined) = coinsData.find((c: CoinData) => c.address === tokensA[i])
    const dataB: (CoinData | undefined) = coinsData.find((c: CoinData) => c.address === tokensB[i])
    if (!dataA || !dataB) return;
    const symbol = `${dataA.symbol}-${dataB.symbol}-saber-lp`
    const confidence = (dataA.confidence ?? 0) > (dataB.confidence ?? 0) ? (dataA.confidence ?? 0) : (dataB.confidence ?? 0)
    const totalTokens = amount / (10 ** decimals)
    const valueA = (supplyA[i].amount as number) * dataA.price / (10 ** dataA.decimals)
    const valueB = (supplyB[i].amount as number) * dataB.price / (10 ** dataB.decimals)
    const price = (valueA + valueB) / totalTokens

    if ((valueA + valueB) < 1e4) return;

    addToDBWritesList(writes, chain, tokens[i], price, decimals, symbol, timestamp, 'saber', confidence)
  })

  return writes
}
