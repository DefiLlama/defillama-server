import { wrapScheduledLambda } from "./utils/shared/wrap";
import { sendMessage } from "./utils/discord"
import { execute } from './storeTvlInterval/errorDb';
import { getCurrentUnixTimestamp } from './utils/date';

const handler = async (_event: any) => {
  const webhookUrl = process.env.STALE_COINS_ADAPTERS_WEBHOOK!
  const now = getCurrentUnixTimestamp()
  const staleCoins = await execute(
`SELECT
  address,
  symbol,
  (? - min(lastUpdate)) AS "lastUpdate"
FROM staleCoins
WHERE
  time > (? - 3600) and lastUpdate > (? - 86400)
GROUP BY address
ORDER BY lastUpdate asc;`, [now, now, now])
  const message = (staleCoins[0] as any[]).map((coin)=>`${coin.symbol}\t${coin.address.padEnd(54, " ")}\t${(coin.lastUpdate/3600).toFixed(2)} hours ago`).join("\n")
  await sendMessage(message, webhookUrl, true)
};

export default wrapScheduledLambda(handler);
