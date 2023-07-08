import { Write, } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
} from "../../utils/database";
import { getApi } from "../../utils/sdk";

const oracles = [
  '0xce676CbAb0B76F95A262Bd460a98B0157110D07a',
]

const chain = 'arbitrum'

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp, true)
  const tranches = await api.multiCall({ abi: 'address:lpToken', calls: oracles })
  const [ decimals, symbols, oraclePrice ] = await Promise.all([
    api.multiCall({ abi: 'uint8:decimals', calls: tranches }),
    api.multiCall({ abi: 'string:symbol', calls: tranches }),
    api.multiCall({ abi: 'address:price', calls: oracles }),
  ])
  tranches.forEach((token: any, i: number) => {
    addToDBWritesList(writes, chain, token, oraclePrice[i] / (10 ** decimals[i]), decimals[i], symbols[i], timestamp, 'level-finance', 0.99)
  })

  return writes
}
