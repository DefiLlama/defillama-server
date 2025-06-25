import { PublicKey } from '@solana/web3.js';
import bridgedTokens from '../bridges/solana'
import { Write } from '../utils/dbInterfaces';
import { getLavaTokens } from './util/lavarage'
import { getConnection } from './utils'
import { getTokenSymbolMap } from './util/tokenMetadata';
import { sliceIntoChunks } from '@defillama/sdk/build/util';
import axios from 'axios'
import { addToDBWritesList } from '../utils/database';

const additionalTokens = [
  'sctmB7GPi5L2Q5G9tUSzXvhZ4YiDMEGcRov9KfArQpx', 
  'roxDFxTFHufJBFy3PgzZcgz6kwkQNPZpi9RfpcAv4bu'
]

async function getTokensWithCGMapping() {
  const tokens = (await bridgedTokens()).map((token) => token.from.replace('solana:', ''));
  return new Set(tokens)
}

export async function jupAg(timestamp: number) {
  const tokens = await getTokensWithCGMapping()
  let lavaTokens = await getLavaTokens()
  lavaTokens = [...additionalTokens, ...lavaTokens.filter((token) => !tokens.has(token))]
  const lavaTokensPK = lavaTokens.map(i => new PublicKey(i))
  const symbolMap = await getTokenSymbolMap(lavaTokens)

  const writes: Write[] = [];
  const connection = await getConnection()
  const chunks = sliceIntoChunks(lavaTokensPK, 99)
  for (const chunk of chunks) {
    const { value } = await connection.getMultipleParsedAccounts(chunk)
    const keyStr = chunk.join(',')
    const jupCall = `https://api.jup.ag/price/v2?ids=${keyStr}&showExtraInfo=true`
    const { data: { data } } = await axios.get(jupCall)
    const tokenData = [] as any
    chunk.forEach((pk, i) => {
      const token = pk.toBase58()
      const priceData = data[token]
      if (!priceData)
        return;
      const symbol = symbolMap[token] ?? '-'
      const info = (value[i] as any)?.data?.parsed?.info as any
      if (!info) return;

      tokenData.push({
        symbol,
        price: +priceData.price,
        decimals: info.decimals,
        confidence: priceData.extraInfo.confidenceLevel,
        sol10Sell: priceData.extraInfo.depth.sellPriceImpactRatio.depth['10'],
      })

      if (priceData.extraInfo.depth.sellPriceImpactRatio.depth['10'] < 5)  // less than 5% slippage
        addToDBWritesList(writes, 'solana', token, +priceData.price, info.decimals, symbol, timestamp, 'jup-ag', priceData.extraInfo.confidenceLevel === 'high' ? 0.9 : 0.6)
    })

  }


  return writes;
}

jupAg(0) // ts-node coins/src/adapters/solana/jupAg.ts