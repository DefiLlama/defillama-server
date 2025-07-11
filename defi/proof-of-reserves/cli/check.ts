import fs from 'fs';
import path from 'path';
import { IPoRAdapter } from '../types';
import { sendMessage } from "../../src/utils/discord";
import * as sdk from '@defillama/sdk';
import { PromisePool } from '@supercharge/promise-pool'

interface Protocoldata {
  protocolId: string;
  backing?: number;
  reservesUSD?: number;
  mintedUSD?: number;
  reservesUSD_hn?: string;
  mintedUSD_hn?: string;
  backingString?: string;
  error?: string;
}

let projects: Array<Protocoldata> = [];
const items = fs.readdirSync(path.join(__dirname, '..', 'adapters'));
for (const item of items) {
  let adapterName = item;
  if (item.includes('.ts')) {
    adapterName = item.split('.ts')[0];
  }

  projects.push({
    protocolId: adapterName,
  });
}

(async function () {

  await PromisePool.withConcurrency(7)
    .for(projects)
    .process(async (project) => {
      try {
        const adapterFile = path.join('..', 'adapters', project.protocolId);
        const adapter: IPoRAdapter = (await import(adapterFile)).default;

        project.mintedUSD = await adapter.minted({});
        project.mintedUSD_hn = sdk.humanizeNumber(project.mintedUSD)
        project.reservesUSD = await adapter.reserves();
        project.reservesUSD_hn = sdk.humanizeNumber(project.reservesUSD)
        project.backing = project.reservesUSD / project.mintedUSD * 100;
        project.backingString = Number(project.backing).toFixed(3) + ' %';
      } catch (e: any) {
        project.error = 'error running the adapter'
        if (e.message) {
          project.error = e.message
        } else {
          project.error = JSON.stringify(e);
        }
      }
    });


  projects.sort((a: any, b: any) => a.backing - b.backing)
  const printColumns = ['protocolId', 'mintedUSD_hn', 'reservesUSD_hn', 'backingString',];

  console.log(sdk.util.tableToString([...projects], printColumns));
  const hasErrors = projects.some(project => project.error);
  if (hasErrors) {
    printColumns.push('error');
  }

  const filteredProtocols = projects.filter(project => !project.backing || isNaN(project.backing) || project.backing <= 98);

  const message = `
Protocols minted tokens more than reserves:

${sdk.util.tableToString([...filteredProtocols], printColumns)}


Using this script: https://github.com/DefiLlama/defillama-server/blob/master/defi/proof-of-reserves/cli/check.ts`

  if (process.env.TEAM_WEBHOOK && filteredProtocols.length > 0) {
    await sendMessage(message, process.env.TEAM_WEBHOOK!, true)
  }

  process.exit(0);
})()
