import { hourlyUsdTokensTvl } from "../../utils/getLastRecord";
import { getLatestProtocolItems, initializeTVLCacheDB } from "../db";
import { protocolsById } from "../../protocols/data";
import * as sdk from "@defillama/sdk";
import { importAdapter } from "../../utils/imports/importAdapter";

const whitelistedTokens = new Set(['WETH', 'USDC', 'USDT', 'SOL', 'ETH',
  // 'coingecko:tether', 'tether', 'bitcoin', 'ethereum',
  'WSTETH', 'WBNB', 'WHYPE', 'BTCB', 'STETH', 'USDC.E', 'SUI', 'WEETH'])

let data: any

export async function getProtocolTokenDominanceTable() {
  if (!data) data = _getProtocolTokenDominanceTable()
  return data;
}

async function _getProtocolTokenDominanceTable() {
  await initializeTVLCacheDB();
  const tokenTable: any = {}
  const data = await getLatestProtocolItems(hourlyUsdTokensTvl, { filterAWeekAgo: true, })
  console.log("Latest protocol items:", data.length);
  const responseTable: any = []
  data.forEach((item: any) => {
    let { tvl } = item.data
    const protocol = protocolsById[item.id]
    if (!tvl || !protocol) return;
    const totalTvl: any = Object.values(tvl).reduce((sum: any, value: any) => sum + value, 0)
    if (totalTvl < 1e6) return; // Skip protocols with low TVL
    const highestToken = Object.entries(tvl).reduce((highest: any, [token, value]: any) => {
      if (value > highest.value)
        return { token, value }

      return highest
    }, { token: '', value: 0 })
    const dominance = (highestToken.value / totalTvl) * 100
    if (whitelistedTokens.has(highestToken.token)) return; // Skip whitelisted tokens

    if (dominance < 10) return; // Skip if dominance is less than 10%
    responseTable.push({
      protocol: protocol.name,
      id: item.id,
      totalTvl: +totalTvl.toFixed(0),
      totalTvlHN: sdk.humanizeNumber(totalTvl),
      highestToken: highestToken.token,
      highestTokenValue: +highestToken.value.toFixed(0),
      highestTokenValueHN: sdk.humanizeNumber(highestToken.value),
      dominance: +dominance.toFixed(3),
      category: protocol.category,
      misrepTokens: !!importAdapter(protocol).misrepresentedTokens,
      forkedFrom: protocol.forkedFrom?.length ? protocol.forkedFrom.join(', ') : '',
    })

    if (!tokenTable[highestToken.token])
      tokenTable[highestToken.token] = 0
    tokenTable[highestToken.token] += 1

  })
  // const entries = Object.entries(tokenTable).filter(i => i[1] > 5)
  // entries.sort((a, b) => b[1] - a[1]) // Sort by count descending
  // console.table(entries)

  responseTable.sort((a: any, b: any) => b.dominance - a.dominance)
  return responseTable
}

if (!process.env.IS_NOT_SCRIPT_MODE)
  getProtocolTokenDominanceTable().then(console.table).catch(console.error).then(() => {
    console.log("Done");
    process.exit(0);
  })