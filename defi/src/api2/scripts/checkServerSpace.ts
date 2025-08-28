import { execSync } from 'child_process'
import { sendMessage } from '../../utils/discord'

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

if (!process.env.IS_NOT_SCRIPT_MODE)
  checkDiskSpace().catch(console.error).then(() => {
    process.exit(0);
  })