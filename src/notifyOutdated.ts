import findOutdated from './utils/findOutdated'
import { wrapScheduledLambda } from "./utils/wrap";
import {sendMessage} from "./utils/discord"

const maxDrift = 4 * 3600; // Max 4 updates missed
const llamaRole = "<@&849669546448388107>"

const handler = async (_event: any) => {
  const message = await findOutdated(maxDrift)
  const webhookUrl = process.env.OUTDATED_WEBHOOK!
  if (message !== null) {
    if(message.length >= 5000){
      await sendMessage(`${llamaRole} everything is broken REEEE`, webhookUrl)
    }
    await sendMessage(message, webhookUrl)
  }
};

export default wrapScheduledLambda(handler);