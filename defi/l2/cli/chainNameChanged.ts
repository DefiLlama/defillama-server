import PromisePool from "@supercharge/promise-pool";
import { fetchAllChainData, overwrite } from "../storeToDb";

const oldChainDisplayName = "Hyperliquid";
const newChainDisplayName = "Hyperliquid L1";
let successCount = 0;
const errors = [];

async function main() {
  const res = await fetchAllChainData(oldChainDisplayName);
  const realData = res.filter((r: any) => {
    if (!r[oldChainDisplayName]) return false;
    if (r[oldChainDisplayName] == null) return false;
    if (r[oldChainDisplayName] == "{}") return false;
    return true;
  });
  await PromisePool.withConcurrency(10)
    .for(realData)
    .process(
      async (data: any) =>
        await overwrite({
          [newChainDisplayName]: JSON.parse(data[oldChainDisplayName]),
          timestamp: JSON.parse(data.timestamp),
        })
          .then(() => {
            successCount += 1;
            console.log(`done ${successCount}/${res.length}`);
          })
          .catch((e) => {
            console.log(e);
            errors.push(data.timestamp);
          })
    );
  console.log("finished");
}

main(); // ts-node defi/l2/cli/chainNameChanged.ts

// should use Ethereum not ethereum
// L1 = 55
// Hyperliqiud = 102

// HL 2025-02-27 13:56:42 => '2517487295'
//

// L1 702
// HL 1710
