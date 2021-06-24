import findOutdated from './utils/findOutdated'
import { wrapScheduledLambda } from "./utils/wrap";
import fetch from "node-fetch"

const maxDrift = 4 * 3600; // Max 4 updates missed

const handler = async (_event: any) => {
    const message = await findOutdated(maxDrift)
    if(message !== null){
      // Example: https://gist.github.com/dragonwocky/ea61c8d21db17913a43da92efe0de634
      // Docs: https://gist.github.com/dragonwocky/ea61c8d21db17913a43da92efe0de634
        await fetch(
            `${process.env.OUTDATED_WEBHOOK!}?wait=true`,
            {
              method: 'post',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                content: "```\n"+message+"\n```" // Put it into a code block to prevent the format from getting messed up
              })
            }
        )
    }
};

export default wrapScheduledLambda(handler);