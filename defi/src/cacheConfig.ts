
import protocols from "./protocols/data";
import entities from "./protocols/entities";
import treasuries from "./protocols/treasury";
import * as sdk from '@defillama/sdk'

async function main() {
  await sdk.cache.writeCache('tvl-db/config.json', { protocols, entities, treasuries })
}

main().catch(console.error).then(() => process.exit(0))