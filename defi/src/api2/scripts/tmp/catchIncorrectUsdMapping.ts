import { dailyTokensTvl } from '../../../utils/getLastRecord'
import protocolsMap from '../../../protocols/data'
import { getLatestProtocolItems } from '../../db/index'

getLatestProtocolItems(dailyTokensTvl, {
  filterLast24Hours: true,
}).then(items => {
  console.log(items.length, 'items fetched')
  for (const item of items) {
    const protocol = protocolsMap[item.id]
    if (item.data.tvl?.hasOwnProperty('usd')) {
      const protocolName = protocol ? protocol.name : item.id
      console.log(`${protocolName} (${item.id}) has usd mapping in tokens tvl: ${item.data.tvl.usd} fix it`)
    }
  }
})