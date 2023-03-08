
import axios from "axios"
import { sliceIntoChunks } from '@defillama/sdk/build/util/index'
import * as sdk from '@defillama/sdk'
import { Connection } from "@solana/web3.js"

let connection: Connection
const endpoint = process.env.SOLANA_RPC || "https://rpc.ankr.com/solana" // or "https://solana-api.projectserum.com/"

export async function getTokenSupplies(tokens: string[]) {
  const formBody = (key: string, i: number) => ({ "jsonrpc": "2.0", "id": i, "method": "getTokenSupply", "params": [key] })
  const tokenBalances = []
  const chunks = sliceIntoChunks(tokens, 99)
  for (let chunk of chunks) {
    const bal = await axios.post(endpoint, chunk.map(formBody))
    tokenBalances.push(...bal.data)
  }
  return tokenBalances.map(i => i.result.value)
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

export function getConnection() {
  if (!connection) connection = new Connection(endpoint)
  return connection
}

// accountsArray is an array of base58 address strings
async function getMultipleAccountsRaw(accountsArray: string[]) {
  if (
    !Array.isArray(accountsArray) ||
    accountsArray.length === 0 ||
    typeof accountsArray[0] !== "string"
  ) {
    throw new Error("Expected accountsArray to be an array of strings");
  }
  const res = []
  const chunks = sliceIntoChunks(accountsArray, 99)
  for (const chunk of chunks) {
    const accountsInfo = await axios.post(endpoint, {
      jsonrpc: "2.0",
      id: 1,
      method: "getMultipleAccounts",
      params: [chunk],
    })
    res.push(...accountsInfo.data.result.value)
  }

  return res;
}

// Gets data in Buffers of all addresses, while preserving labels
// Example: labeledAddresses = { descriptiveLabel: "9xDUcgo8S6DdRjvrR6ULQ2zpgqota8ym1a4tvxiv2dH8", ... }
export async function getMultipleAccountBuffers(labeledAddresses: any) {
  let labels: any = [];
  let addresses: any = [];

  for (const [label, address] of Object.entries(labeledAddresses)) {
    labels.push(label);
    addresses.push(address);
  }
  const accountsData = await getMultipleAccountsRaw(addresses);

  const results: any = {};
  accountsData.forEach((account, index) => {
    if (account === null) {
      results[labels[index]] = null;
    } else {
      results[labels[index]] = Buffer.from(account.data[0], account.data[1]);
    }
  });

  return results;
}
