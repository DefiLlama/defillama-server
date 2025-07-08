import fs from 'fs';
import { IPoRAdapter } from '../types';
import { tableToString } from '../utils/utils';
import { sendMessage } from "../../src/utils/discord";

interface Protocoldata {
  protocolId: string;
  backing?: number;
  reservesUSD?: number;
  mintedUSD?: number;
}

const projects: Array<Protocoldata> = [];
const items = fs.readdirSync(`${__dirname}/../adapters`);
for (const item of items) {
  let adapterName = item;
  if (item.includes('.ts')) {
    adapterName = item.split('.ts')[0];
  }

  projects.push({
    protocolId: adapterName,
  });
}

(async function (){
  for (const project of projects) {
    const adapterFile = `../adapters/${project.protocolId}`;
    const adapter: IPoRAdapter = (await import(adapterFile)).default;
  
    project.mintedUSD = await adapter.minted({});
    project.reservesUSD = await adapter.reserves();
    project.backing = project.reservesUSD / project.mintedUSD * 100;
  }

  const message = `
Protocols minted tokens more than reserves:\n\n${tableToString(projects.filter(project => project.backing !== undefined && project.backing <= 98), Object.keys(projects[0]))}\n\n
Using this script: https://github.com/DefiLlama/defillama-server/blob/master/defi/proof-of-reserves/cli/check.ts
  `

  console.log(message);

  if (process.env.CHECK_POR_DISCORD_WEBHOOK) {
    await sendMessage(message, process.env.CHECK_POR_DISCORD_WEBHOOK!, false)
  }

  process.exit(0);
})()
 