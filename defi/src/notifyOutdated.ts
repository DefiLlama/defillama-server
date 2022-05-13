import findOutdated, { getOutdated } from './utils/findOutdated'
import { wrapScheduledLambda } from "./utils/shared/wrap";
import {sendMessage} from "./utils/discord"

const maxDrift = 4 * 3600; // Max 4 updates missed
const llamaRole = "<@&849669546448388107>"

const handler = async (_event: any) => {
  const webhookUrl = process.env.OUTDATED_WEBHOOK!
  const outdated = await getOutdated(3600); // 1hr
  if(outdated.length > 100){
    await sendMessage(`${llamaRole} more than 100 adapters haven't updated their data in the last hour`, webhookUrl, false)
  }
  const message = await findOutdated(maxDrift)
  if (message !== null) {
    if(message.length >= 8000){
      await sendMessage(`${llamaRole} everything is broken REEEE`, webhookUrl, false)
    }
    await sendMessage(message, webhookUrl)
  }
};

export default wrapScheduledLambda(handler);
