import { execSync } from 'child_process'
import { sendMessage } from '../../utils/discord'
import * as sdk from '@defillama/sdk'

export async function checkDiskSpace(): Promise<void> {
  try {
    const output = execSync('df -BG /', { encoding: 'utf8' })
    const lines = output.trim().split('\n')
    const dataLine = lines[1].split(/\s+/)

    const totalGB = parseInt(dataLine[1].replace('G', ''))
    const usedGB = parseInt(dataLine[2].replace('G', ''))
    const availableGB = parseInt(dataLine[3].replace('G', ''))
    const UsedPercentage = dataLine[4]

    console.log(`Total disk space: ${totalGB} GB`)
    console.log(`Total used space: ${usedGB} GB`)
    console.log(`Free disk space: ${availableGB} GB`)
    console.log(`Used percentage: ${UsedPercentage}`)

    const serverName = process.env.SERVER_NAME ?? 'the server'

    if (availableGB < 50)
      return sendMessage(`[${serverName}] Insufficient disk space: Only ${availableGB} GB available (minimum 50 GB required)`, process.env.DIM_CHANNEL_WEBHOOK!)

  } catch (error) {
    if (error instanceof Error && error.message.includes('Insufficient disk space')) {
      throw error
    }
    throw new Error('Failed to check disk space')
  }
}

export async function checkSystemLoad(): Promise<void> {
  return; // skip this check for now
  try {
    // Get system load using uptime command
    const output = execSync('uptime', { encoding: 'utf8' });

    // Extract load averages from the output
    // Format example: "11:17:27 up 7 days, 22:22, 1 user, load average: 0.00, 0.01, 0.05"
    const loadMatch = output.match(/load average:\s+([\d.]+),\s+([\d.]+),\s+([\d.]+)/);

    if (!loadMatch) {
      throw new Error('Failed to parse system load from uptime command');
    }

    // Calculate average of 1-minute, 5-minute, and 15-minute load values
    const oneMinuteLoad = (parseFloat(loadMatch[1]) + parseFloat(loadMatch[2]) + parseFloat(loadMatch[3])) / 3;

    console.log(`Current system load (1m): ${oneMinuteLoad}`);

    const serverName = process.env.SERVER_NAME ?? 'the server';

    // Check if load exceeds threshold
    if (oneMinuteLoad > 10) {
      const { lastNotification } = (await sdk.cache.readExpiringJsonCache('highSystemLoadNotification')) ?? {}; // 4 hours

      if (Date.now() - (lastNotification ?? 0) < 4 * 60 * 60 * 1000) {
        console.log('High system load detected but notification already sent recently, skipping alert.');
        return;
      }

      await sdk.cache.writeExpiringJsonCache('highSystemLoadNotification', { lastNotification: Date.now() }, { expireAfter: 4 * 60 * 60 }); // 4 hours

      await sendMessage(
        `[${serverName}] High system load detected: ${oneMinuteLoad} (threshold: 10)`,
        process.env.DIM_CHANNEL_WEBHOOK!
      );
    }
  } catch (error) {
    throw new Error('Failed to check system load');
  }
}


if (!process.env.IS_NOT_SCRIPT_MODE)
  checkDiskSpace().then(checkSystemLoad).catch(async e => {
    console.error(e);
    let errorMessage = e instanceof Error ? e.message : e;
    const { lastErrorTime } = (await sdk.cache.readExpiringJsonCache('lastErrorNotification')) ?? {};
    if (Date.now() - (lastErrorTime ?? 0) > 4 * 60 * 60 * 1000) { // 4 hours
      await sendMessage(`Error checking server space or load: ${errorMessage}`, process.env.DIM_CHANNEL_WEBHOOK!)
      await sdk.cache.writeExpiringJsonCache('lastErrorNotification', { lastErrorTime: Date.now() }, { expireAfter: 4 * 60 * 60 }) // 4 hours
    }
  }).then(() => {
    process.exit(0);
  })