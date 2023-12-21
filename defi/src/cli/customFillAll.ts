require("dotenv").config();

import protocols from "../protocols/data";
import * as sdk from '@defillama/sdk'
import { importAdapterDynamic } from "../utils/imports/importAdapter";
import * as childProcess from 'child_process'
import { hourlyTvl, } from "../utils/getLastRecord";
import { getHistoricalValues } from "../utils/shared/dynamodb";
// @ts-ignore
import { ibcChains, caseSensitiveChains, } from "@defillama/adapters/projects/helper/tokenMapping";

const chainsWithoutRefillSupport = new Set([ibcChains, caseSensitiveChains].flat())


const main = async () => {
  const protocolCount = +(process.argv[2] ?? 200) // how many protocols to fill
  const allProtocols = protocols.reverse().slice(0, protocolCount)
  const checkRefillSuppport = (adapter: any) => Object.keys(adapter).filter(i => typeof adapter[i] === 'function' && chainsWithoutRefillSupport.has(i)).length === 0
  for (const protocol of allProtocols) {
    const adapter = await importAdapterDynamic(protocol);
    if (adapter.timetravel === false || !checkRefillSuppport(adapter)) {
      console.log("Adapter doesn't support refilling: ", protocol.name, 'skipping');
      continue;
    }
    const hourlyItems = await getHistoricalValues(hourlyTvl(protocol.id))
    console.log('hourlyItems', hourlyItems.length, protocol.name, protocol.id)
    let params = []
    if (hourlyItems.length > 0) {
      const lowestTimestamp = hourlyItems.reduce((lowest, item) => Math.min(lowest, item.SK), hourlyItems[0].SK)
      params.push(lowestTimestamp)
    }
    await runScript(protocol.name, params)
  }
};

main().then(() => {
  console.log('Done!!!')
  process.exit(0)
})


async function runScript(protocol: string, params: any = []) {
  const start = +new Date()
  console.log('[Start]', protocol, ...params)
  const env = {
    ...process.env,
    HISTORICAL: 'true',
  }

  return new Promise((resolve: any, _reject: any) => {
    const subProcess = childProcess.spawn('npm', ['run', 'fillOld', protocol, ...params], { stdio: 'inherit', env: env });

    subProcess.on('close', (code: any) => {
      const runTime = ((+(new Date) - start) / 1e3).toFixed(1)
      console.log(`[Done] ${protocol} | runtime: ${runTime}s  `)
      if (code === 0) {
        resolve()
      } else {
        console.log('[Error]', `Child process exited with code ${code}`, protocol, ...params)
        resolve();
      }
    });
  });
}
