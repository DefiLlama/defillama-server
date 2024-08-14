
import { Write, CoinData, } from "../../utils/dbInterfaces";
import { addToDBWritesList, getTokenAndRedirectData, } from "../../utils/database";
import { getConfig, } from "../../../utils/cache";
import { getTokenAccountBalances, getTokenSupplies, getConnection, getMultipleAccountBuffers, } from "../utils";
import { PublicKey, } from "@solana/web3.js"
import * as sdk from '@defillama/sdk'

export function saber(timestamp: number) {
  return Promise.all([
    getTokenPrices(timestamp),
    priceMSOL(timestamp),
    priceMSOL2(timestamp),
  ])
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

async function priceMSOL(timestamp: number) {

  const MSOL_LP_SOL = new PublicKey("UefNb6z6yvArqe4cJHTXCqStRsKmWhGxnZzuHbikP5Q")
  const MSOL_LP_MSOL = new PublicKey("7GgPYjS5Dza89wV6FpZ23kUJRG5vbQ1GM25ezspYFSoE")
  const MSOL_LP_MINT = new PublicKey("LPmSozJJ8Jh69ut2WP3XmVohTjL4ipR18yiCzxrUmVj")
  const MSOL = 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So'
  const SOL = 'So11111111111111111111111111111111111111112'
  const connection = getConnection();
  const accountData = await getMultipleAccountBuffers({ msolTokens: MSOL_LP_MSOL.toString(), poolMint: MSOL_LP_MINT.toString(), });

  const solAmount = ((await connection.getAccountInfo(MSOL_LP_SOL)) as any).lamports / 10 ** 9;
  const msolAmount = Number(accountData.msolTokens.readBigUInt64LE(64)) / 10 ** 9;
  const lpSupply = Number(accountData.poolMint.readBigUInt64LE(4 + 32)) / 10 ** 9;
  const tokenData = await getTokenAndRedirectData([SOL, MSOL], chain, timestamp)
  const writes: Write[] = [];

  const solPrice: (CoinData | undefined) = tokenData.find((c: CoinData) => c.address === SOL)
  const msolPrice: (CoinData | undefined) = tokenData.find((c: CoinData) => c.address === MSOL)
  if (!solPrice || !msolPrice) return writes;

  const price = (msolAmount * msolPrice.price + solAmount * solPrice.price) / lpSupply
  addToDBWritesList(writes, chain, MSOL_LP_MINT.toString(), price, 9, 'mSOL-SOL-LP', timestamp, 'mSOL-SOL-LP', 0.95)
  return writes
}


async function priceMSOL2(timestamp: number) {
  const writes: Write[] = [];


  const pools = [
    {
      symbol: "SOL-mSOL-MLP",
      mint: "B2uEs9zjnz222hfUaUuRgesryUEYwy3JGuWe31sE9gsG",
      poolAddress: "HcjZvfeSNJbNkfLD4eEcRBr96AD3w1GpmMppaeRZf7ur",
      vaults: ['HZeLxbZ9uHtSpwZC3LBr4Nubd14iHwz7bRSghRZf5VCG', '3ifhD4Ywaa8aBZAaQSqYgN4Q1kaFArioLU8uumJMaqkE'],
      lpVaults: ['HWnWnLvBzvSmXH5hnHJCFmuQbDTsX3Ba2w9CPE5zf4YD', 'GGG4DxkYa86g2v4KwtvR8Xu2tXEp1xd4BRC3yNnpve3g'],
      lpVaultToken: ['FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j', '21bR3D4QR4GzopVco44PVMBXwHFpSYrbrdeNwdKk7umb'],
      tokenAMint: "So11111111111111111111111111111111111111112",
      tokenBMint: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    },
    {
      symbol: "SOL-bSOL-MLP",
      mint: "8ioaL3gTSAhNJy3t9JakXuoKobJvms62Ko5aWHvmHgSf",
      poolAddress: "DvWpLaNUPqoCGn4foM6hekAPKqMtADJJbJWhwuMiT6vK",
      vaults: ['HZeLxbZ9uHtSpwZC3LBr4Nubd14iHwz7bRSghRZf5VCG', 'EMbnLAPWQtbdp6qA9XNAxMBrEESMwhopmDQKLtsXFMK6'],
      lpVaults: ['BWajRkDXMprxxxPZ9LCh9mJKzCzAxfToTiWyjDJBQwJ9', '78PvjMRngHV9fnw7M9bzr86GmU6nsZzsNLmYkphpboqB'],
      lpVaultToken: ['FZN7QZ8ZUUAxMPfxYEYkH3cXUASzH8EqA6B4tyCL8f1j', 'B17utvBuKjiZpBrRZrkDaKWwmNGoLN1vfXFnwhRbB1eZ'],
      tokenAMint: "So11111111111111111111111111111111111111112",
      tokenBMint: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    },
  ];
  const getSupply = (i: any, decimals = 0) => Number(i.readBigUInt64LE(4 + 32).toString() / 10 ** decimals)
  const getBalance = (i: any) => Number(i.readBigUInt64LE(64))

  // logic: https://github.com/mercurial-finance/mercurial-dynamic-amm-sdk/blob/master/ts-client/src/amm/utils.ts#L225
  for (const pool of pools) {
    const { mint, vaults: [vaultA, vaultB], lpVaults: [lvaultA, lvaultB], tokenAMint, tokenBMint, decimals = 9, symbol, lpVaultToken: [lvtA, lvtB] } = pool as any
    const res = await getMultipleAccountBuffers({ mint, vaultA, vaultB, lvaultA, lvaultB, lvtA, lvtB, });

    const lpSupply = getSupply(res.mint, decimals)
    // console.log(lpSupply)
    // console.log(getBalance(res.vaultA)/1e12, getBalance(res.lvaultA)/1e12, getSupply(res.lvtA)/1e12, getBalance(res.lvaultA) / getSupply(res.lvtA))
    // console.log(getBalance(res.vaultB)/1e12, getBalance(res.lvaultB)/1e12, getSupply(res.lvtB)/1e12, getBalance(res.lvaultB) / getSupply(res.lvtB))
    const tokenABal = getBalance(res.vaultA) * getBalance(res.lvaultA) / getSupply(res.lvtA)
    const tokenBBal = getBalance(res.vaultB) * getBalance(res.lvaultB) / getSupply(res.lvtB)
    const coinBalances = new sdk.ChainApi({ chain: 'solana', })
    coinBalances.add(tokenAMint, tokenABal)
    coinBalances.add(tokenBMint, tokenBBal)
    const price = (await coinBalances.getUSDValue()) / lpSupply
    // console.log(tokenABal/1e12, tokenBBal/1e12, (await coinBalances.getUSDValue())/1e6, lpSupply/1e3)
    addToDBWritesList(writes, chain, mint, price, decimals, symbol, timestamp, 'saber', 0.95)
  }

  return writes
}