import { getProvider } from "@defillama/sdk";
import PromisePool from "@supercharge/promise-pool";
import setEnvSecrets from "../utils/shared/setEnvSecrets";
import { adaptersRepoChainsJson as chains } from "../getChains";
import { sendMessage } from "../../../defi/src/utils/discord";

type Rpc = {
  rpc: string;
  block: number;
};

type Results = { [chain: string]: Rpc[] };

const margin = 0.1; // 10% error

const user = "<@!577529505871167498>"; // wayne

const whitelist = [
  "https://api.metadium.com/dev",
  "https://api.metadium.com/prod",
  "https://rpc.publicgoods.network",
];

const findMedian = (arr: number[]): number => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

async function collectHeights(results: Results) {
  await Promise.all(
    chains.map(async (chain: string) => {
      results[chain] = [];
      const provider: any = getProvider(chain);
      if (!provider) return;

      await PromisePool.for(provider.rpcs)
        .withConcurrency(1)
        .process(async (rpc: any) => {
          let thisProvider = provider;
          thisProvider.rpcs = [rpc];
          const block = await provider.getBlock("latest");
          results[chain].push({ rpc: rpc.url, block: block.number });
        });
    }),
  );
}

async function logErrors(results: Results) {
  let errors = ``;
  Object.keys(results).map((chain: string) => {
    const heightsArray = results[chain].map((rpc: Rpc) => rpc.block);
    if (!heightsArray.length) return;
    const medianBlock = findMedian(heightsArray);

    results[chain].map((rpc: Rpc) => {
      if (whitelist.includes(rpc.rpc)) return;
      if (
        rpc.block > medianBlock * (1 - margin) &&
        rpc.block < medianBlock * (1 + margin)
      )
        return;
      errors = `${errors}${rpc.rpc} returning a faulty block height of ${rpc.block}\n`;
    });
  });

  return errors;
}

async function main() {
  // await setEnvSecrets();
  const results: { [chain: string]: Rpc[] } = {};
  await collectHeights(results);
  const errors = await logErrors(results);
  if (errors.length)
    await sendMessage(
      `${errors} ${user}`,
      process.env.STALE_COINS_ADAPTERS_WEBHOOK!,
    );
}

main(); // ts-node coins/src/cli/checkRpcBlocks.ts
