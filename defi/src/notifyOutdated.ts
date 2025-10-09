import { buildOutdatedMessage, findOutdatedPG, } from './utils/findOutdated'
import { sendMessage } from "./utils/discord"
import axios from 'axios'
import { getHourlyTvlUpdatedRecordsCount, initializeTVLCacheDB, getDimensionsUpdatedRecordsCount, getTweetsPulledCount, } from './api2/db';
import { elastic, cache } from '@defillama/sdk';
import { tableToString } from './api2/utils';

const maxDrift = 6 * 3600; // Max 4 updates missed
const llamaRole = "<@&849669546448388107>"


async function checkBuildStatus(webhookUrl: string) {
  const actionsApi = 'https://api.github.com/repos/DefiLlama/defillama-server/actions/runs?per_page=100'
  let { data: { workflow_runs } } = await axios.get(actionsApi)
  workflow_runs = workflow_runs.filter((i: any) => i.name === 'Defi')
  let i = 0
  while (workflow_runs[i] && workflow_runs[i].conclusion !== 'success') i++
  if (i > 2)
    await sendMessage(`Last ${i} builds failed, check: https://github.com/DefiLlama/defillama-server/actions`, webhookUrl)
}

export async function notifyOutdatedPG() {
  await notifyBlockedDimensionUpdates()


  const webhookUrl = process.env.OUTDATED_WEBHOOK!
  const teamwebhookUrl = process.env.TEAM_WEBHOOK!
  const currentHour = new Date().getUTCHours();

  // check if the data is being updated for tvl, dimensions and tweets
  try {

    await initializeTVLCacheDB()

    const tvlUpdateCount = await getHourlyTvlUpdatedRecordsCount()
    const dimUpdateCount = await getDimensionsUpdatedRecordsCount()
    const tweetsPulledCount = currentHour % 6 === 0 ? await getTweetsPulledCount() : 0
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

    if (tweetsPulledCount < 500 && currentHour % 6 === 0)
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

  const cexOutdated = await findOutdatedPG(maxDrift, { categories: ['CEX'] })
  const cexOver100m = cexOutdated.filter((o: any) => o[1]?.tvl > 100_000_000);
  if (cexOver100m.length > 0) {
    await sendMessage(buildOutdatedMessage(cexOver100m) as any, teamwebhookUrl)
  }

  if (message !== null) {
    if (message.length >= 16000) {
      await sendMessage(`${llamaRole} everything is broken REEEE`, webhookUrl, false)
    }
    await sendMessage(message, webhookUrl)
  }

  await checkBuildStatus(webhookUrl)
}

async function notifyBlockedDimensionUpdates() {
  try {
    const esClient = elastic.getClient()
    const aDayAgo = Math.floor(Date.now() / 1000) - 24 * 3600
    let { lastCheckTS } = (await cache.readExpiringJsonCache('lastBlockedDimensionCheck')) || { lastCheckTS: 0 }
    if (!lastCheckTS || lastCheckTS < aDayAgo) lastCheckTS = aDayAgo - 1


    let { hits: { hits: blockedDataSinceLastNotification } }: any = await esClient?.search({
      index: 'dimension-blocked*',
      size: 9999,
      body: {
        query: {
          range: { // find records with reportTime > lastCheckTS
            reportTime: {
              gt: lastCheckTS * 1000, // reportTime is in ms
            }
          }
        }
      }
    })

    if (!blockedDataSinceLastNotification?.length) return;

    blockedDataSinceLastNotification = blockedDataSinceLastNotification.map((h: any) => h._source)


    let linkToKibana = process.env.ES_KIBANA_LINK ?? ''

    if (linkToKibana)
      linkToKibana = ` Please check the logs ${linkToKibana} for more details.`

    console.log('blocked dimension updates #', blockedDataSinceLastNotification?.length)
    let message = tableToString(blockedDataSinceLastNotification.slice(0, 42), ['adapterType', 'name', 'id', 'type', 'timeS', 'message',])
    let trimmedMessage = ''
    if (blockedDataSinceLastNotification.length > 42) {
      trimmedMessage = `\n... and ${blockedDataSinceLastNotification.length - 42} more`
    }


    message = `These are the blocked dimension updates since the last notification:
    ${message}

    ${trimmedMessage}   ${linkToKibana}
    `
    await sendMessage(message, process.env.DIM_CHANNEL_WEBHOOK!)

    const timeNow = Math.floor(Date.now() / 1000)
    await cache.writeExpiringJsonCache('lastBlockedDimensionCheck', { lastCheckTS: timeNow }, { expireAfter: 7 * 24 * 3600 })
    await esClient?.close()

  } catch (e) {
    console.error('Error in notifyBlockedDimensionUpdates', e)
  }
}