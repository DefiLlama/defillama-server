import { PublicKey } from "@solana/web3.js"
import { getMultipleAccountBuffers, } from "../utils"
import { getDbMetadata } from "../../utils/database"



const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

// https://github.com/metaplex-foundation/mpl-token-metadata/blob/main/idls/token_metadata.json
async function _getTokenSymbolMap(tokens: string[]) {
  if (!tokens.length) return {}
  const tokenSymbolMap = {} as Record<string, string>
  const metadataAccounts = tokens.map(getMetadataAccount)
  const labeledAccounts = {} as Record<string, string>
  tokens.forEach((token, i) => {
    labeledAccounts[token] = metadataAccounts[i].toBase58()
  })
  const accountDatas = await getMultipleAccountBuffers(labeledAccounts)
  Object.keys(labeledAccounts).forEach((token) => {
    const data = accountDatas[token]
    if (!data) return;
    let ii = 50
    while (ii < 70) {
      ii++
      const symbolLength = data.readUInt32LE(ii);
      const symbol = data.slice(ii, ii + symbolLength).toString('utf-8').trim().replace(/\x00/g, '')
      const hasNonAscii = !symbol.length || /[^\x00-\x7F]/.test(symbol)
      if (hasNonAscii) continue;
      tokenSymbolMap[token] = symbol
    }
  })

  return tokenSymbolMap
}


export async function getTokenSymbolMap(tokens: string[]) {
  const tokenSet = new Set(tokens)
  const metadata = await getDbMetadata(tokens, 'solana')
  const symbolMap = {} as Record<string, string>
  Object.entries(metadata).forEach(([address, data]) => {
    if (!data.symbol) return;
    symbolMap[address] = data.symbol
    tokenSet.delete(address)
  })
  const missingTokens = [...tokenSet]
  const map2 = await _getTokenSymbolMap(missingTokens)
  return { ...symbolMap, ...map2 }
}


function getMetadataAccount(mint: string): PublicKey {
  const [metadataAccount] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    MPL_TOKEN_METADATA_PROGRAM_ID
  );
  return metadataAccount;
}
