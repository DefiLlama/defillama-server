import { buildOutdatedMessage, findOutdatedPG, getOutdated } from './utils/findOutdated'
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { sendMessage } from "./utils/discord"
import axios from 'axios'
import protocols from './protocols/data';
import { shuffleArray } from './utils/shared/shuffleArray';
import invokeLambda from './utils/shared/invokeLambda';

const maxDrift = 6 * 3600; // Max 4 updates missed
const llamaRole = "<@&849669546448388107>"


const handler = async (_event: any) => {
  const webhookUrl = process.env.OUTDATED_WEBHOOK!
  const hourlyOutdated = await getOutdated((60 * 4 + 20) * 60); // 1hr
  await sendMessage(`${hourlyOutdated.length} adapters haven't updated their data in the last 4 hour`, webhookUrl, false)
  await sendMessage(buildOutdatedMessage(hourlyOutdated) ?? "No protocols are outdated", process.env.HOURLY_OUTDATED_WEBHOOK!)
  const outdated = await getOutdated(maxDrift);
  const message = buildOutdatedMessage(outdated)
  if (message !== null) {
    if (hourlyOutdated.length >= 320) {
      await sendMessage(`${llamaRole} everything is broken REEEE`, webhookUrl, false)
    }
    await sendMessage(message, webhookUrl)
  }
  /* 
    const protocolIndexes = (await getOutdated(6 * 3600)).map(o => o[3]).filter(o => o < protocols.length); // remove treasuries
    shuffleArray(protocolIndexes);
    for (let i = 0; i < protocols.length; i += 40) {
      const event = {
        protocolIndexes: protocolIndexes.slice(i, i + 40)
      };
      await invokeLambda(`defillama-prod-storeTvlInterval2`, event);
    }
   */
  await checkBuildStatus(webhookUrl)
};

async function checkBuildStatus(webhookUrl: string) {
  const actionsApi = 'https://api.github.com/repos/DefiLlama/defillama-server/actions/runs?per_page=100'
  let { data: { workflow_runs } } = await axios.get(actionsApi)
  workflow_runs = workflow_runs.filter((i: any) => i.name === 'Defi')
  let i = 0
  while (workflow_runs[i] && workflow_runs[i].conclusion !== 'success') i++
  if (i > 2)
    await sendMessage(`Last ${i} builds failed, check: https://github.com/DefiLlama/defillama-server/actions`, webhookUrl)
}

export default wrapScheduledLambda(handler);


export async function notifyOutdatedPG() {
  const webhookUrl = process.env.OUTDATED_WEBHOOK!
  const hourlyOutdated = await findOutdatedPG((60 * 4 + 20) * 60); // 4.5hr

  await sendMessage(`${hourlyOutdated.length} adapters haven't updated their data in the last 4 hour`, webhookUrl, false)
  await sendMessage(buildOutdatedMessage(hourlyOutdated) ?? "No protocols are outdated", process.env.HOURLY_OUTDATED_WEBHOOK!)

  const outdated = await findOutdatedPG(maxDrift);
  const message = buildOutdatedMessage(outdated)
  if (message !== null) {
    if (message.length >= 16000) {
      await sendMessage(`${llamaRole} everything is broken REEEE`, webhookUrl, false)
    }
    await sendMessage(message, webhookUrl)
  }

  await checkBuildStatus(webhookUrl)
}