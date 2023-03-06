
import axios from "axios"
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import * as sdk from '@defillama/sdk'

const endpoint = process.env.SOLANA_RPC || "https://rpc.ankr.com/solana" // or "https://solana-api.projectserum.com/"

export async function getTokenSupplies(tokens: string[]) {
  const formBody = (key: string, i: number) => ({ "jsonrpc": "2.0", "id": i, "method": "getTokenSupply", "params": [key] })
  const tokenBalances = []
  const chunks = sliceIntoChunks(tokens, 99)
  for (let chunk of chunks) {
    const bal = await axios.post(endpoint, chunk.map(formBody))
    tokenBalances.push(...bal.data)
  }
  const response: any = []
  tokenBalances.forEach(i => {
    response[i.id] = i.result.value
  })
  return response
}

export async function getTokenAccountBalances(tokenAccounts: string[], { individual = false, chunkSize = 99, allowError = false, } = {}): Promise<any> {
  const formBody = (account: string) => ({ method: "getAccountInfo", jsonrpc: "2.0", params: [account, { encoding: "jsonParsed", commitment: "confirmed" }], id: account })
  const balancesIndividual: any[] = []
  const balances = {}
  const chunks = sliceIntoChunks(tokenAccounts, chunkSize)
  for (const chunk of chunks) {
    const body = chunk.map(formBody)
    const data = await axios.post(endpoint, body);
    data.data.forEach(({ result: { value } }: any, i: any) => {
      if (!value || !value.data.parsed) {
        if (tokenAccounts[i].toString() === '11111111111111111111111111111111') {
          return;
        }
        console.log(data.data.map((i: any) => i.result.value)[i], tokenAccounts[i].toString())
        if (allowError) return;
      }
      const { data: { parsed: { info: { mint, tokenAmount: { amount } } } } } = value
      sdk.util.sumSingleBalance(balances, mint, amount)
      balancesIndividual.push({ mint, amount })
    })
    // if (chunks.length > 4) {
    //   log('waiting before more calls')
    //   await sleep(300)
    // }
  }
  if (individual) return balancesIndividual
  return balances
}