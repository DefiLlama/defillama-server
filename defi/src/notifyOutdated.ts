import { buildOutdatedMessage, findOutdatedPG, getOutdated } from './utils/findOutdated'
import { wrapScheduledLambda } from "./utils/shared/wrap";
import { sendMessage } from "./utils/discord"
import axios from 'axios'
import { getHourlyTvlUpdatedRecordsCount, initializeTVLCacheDB, getDimensionsUpdatedRecordsCount, getTweetsPulledCount, } from './api2/db';

const maxDrift = 6 * 3600; // Max 4 updates missed
const llamaRole = "<@&849669546448388107>"


const handler = async (_event: any) => {
  const webhookUrl = process.env.OUTDATED_WEBHOOK!
  const hourlyOutdated = await getOutdated((60 * 4 + 20) * 60); // 1hr
  await sendMessage(`${hourlyOutdated.length} adapters haven't updated their data in the last 4 hours`, webhookUrl, false)
  if (hourlyOutdated.length > 100) {
    await sendMessage(`${hourlyOutdated.length} adapters haven't updated their data in the last 4 hours ${hourlyOutdated.length > 400 ? llamaRole : ''}`, process.env.TEAM_WEBHOOK, false)
  }
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
  const teamwebhookUrl = process.env.TEAM_WEBHOOK!
  const currentHour = new Date().getUTCHours();

  // check if the data is being updated for tvl, dimensions and tweets
  try {

    await initializeTVLCacheDB()

    const tvlUpdateCount = await getHourlyTvlUpdatedRecordsCount()
    const dimUpdateCount = await getDimensionsUpdatedRecordsCount()
    const tweetsPulledCount = await getTweetsPulledCount()
    const debugString = `
  tvl update count: ${tvlUpdateCount} (in the last 2 hours)
  dimensions update count: ${dimUpdateCount} (in the last 2 hours)
  tweets pulled count: ${tweetsPulledCount} (in the last 3 days)
    `



    console.log(debugString)
    await sendMessage(debugString, webhookUrl)

    if (tvlUpdateCount < 500)
      await sendMessage(`Only ${tvlUpdateCount} tvl records were updated in the last 2 hours, check the pipeline if everything is fine`, teamwebhookUrl)

    if (dimUpdateCount < 500)
      await sendMessage(`Only ${dimUpdateCount} dimension records were updated in the last 2 hours, check the pipeline if everything is fine`, teamwebhookUrl)

    if (tweetsPulledCount < 500)
      await sendMessage(`Only ${tweetsPulledCount} tweets were pulled in the last 3 days, check the pipeline if everything is fine`, teamwebhookUrl)

  } catch (e) {
    console.error(e)
  }

  // now this check runs every 4th hour
  if (currentHour % 4 === 0) {
    const hour12Outdated = await findOutdatedPG(12 * 3600); // 12hr
    const ignoredSet = new Set(['Synthetix', 'Defi Saver']);
    const failedOver100m = hour12Outdated.filter((o: any) => o[1]?.tvl > 100_000_000 && !ignoredSet.has(o[0]));
    if (failedOver100m.length > 0) {
      await sendMessage(buildOutdatedMessage(failedOver100m) as any, teamwebhookUrl)
    }
  }

  // await sendMessage(errorMessage, process.env.TEAM_WEBHOOK!)
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