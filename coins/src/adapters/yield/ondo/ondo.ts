import { Write, } from "../../utils/dbInterfaces";
import {
  addToDBWritesList,
} from "../../utils/database";
import { getApi } from "../../utils/sdk";

const fluxTokens = [
  '0x1dd7950c266fb1be96180a8fdb0591f70200e018', // OUSG
]

const oracle = '0xBa9B10f90B0ef26711373A0D8B6e7741866a7ef2'
const chain = 'ethereum'

export default async function getTokenPrices(timestamp: number) {
  const writes: Write[] = [];
  const api = await getApi(chain, timestamp, true)
  const ondoTokens = await api.multiCall({ abi: 'address:underlying', calls: fluxTokens })
  const [ decimals, symbols, oraclePrice ] = await Promise.all([
    api.multiCall({ abi: 'uint8:decimals', calls: ondoTokens }),
    api.multiCall({ abi: 'string:symbol', calls: ondoTokens }),
    api.multiCall({ abi: 'function getUnderlyingPrice(address) view returns (uint256)', calls: fluxTokens, target: oracle, }),
  ])
  ondoTokens.forEach((token: any, i: number) => {
    addToDBWritesList(writes, chain, token, oraclePrice[i] / (10 ** decimals[i]), decimals[i], symbols[i], timestamp, 'ondo', 0.99)
  })

  return writes
}
