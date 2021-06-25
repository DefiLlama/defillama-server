import findOutdated from './utils/findOutdated'
import { wrapScheduledLambda } from "./utils/wrap";
import fetch from "node-fetch"

const maxDrift = 4 * 3600; // Max 4 updates missed

async function sendMessage(message: string) {
  const formattedMessage = "```\n" + message + "\n```" // Put it into a code block to prevent the format from getting messed up
  if(formattedMessage.length >= 2000){
    const lines = message.split('\n')
    if(lines.length <= 2){
      throw new Error("Lines are too long, reaching infinite recursivity")
    }
    const mid = Math.round(lines.length/2)
    await sendMessage(lines.slice(0, mid).join('\n'))
    await sendMessage(lines.slice(mid).join('\n'))
    return
  }
  // Example: https://gist.github.com/dragonwocky/ea61c8d21db17913a43da92efe0de634
  // Docs: https://gist.github.com/dragonwocky/ea61c8d21db17913a43da92efe0de634
  const response = await fetch(
    `${process.env.OUTDATED_WEBHOOK!}?wait=true`,
    {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: formattedMessage
      })
    }
  ).then(body => body.json())
  console.log(response)
}

const handler = async (_event: any) => {
  const message = await findOutdated(maxDrift)
  if (message !== null) {
    await sendMessage(message)
  }
};

export default wrapScheduledLambda(handler);