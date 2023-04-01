import { wrapScheduledLambda } from "./utils/shared/wrap";
import { sendMessage } from "./utils/discord";
import { getCurrentUnixTimestamp } from "./utils/date";
import postgres from "postgres";

const handler = async (_event: any) => {
  const webhookUrl = process.env.STALE_COINS_ADAPTERS_WEBHOOK!;
  const now = getCurrentUnixTimestamp();
  const sql = postgres(process.env.COINS_DB!);

  const staleCoins = await sql`
    SELECT
      address,
      symbol,
      ${now} - lastupdate as latency
    FROM public.stalecoins
    WHERE
      time > (${now} - 10800) and lastupdate > (${now} - 86400)
    GROUP BY address, symbol, latency
    ORDER BY latency asc;`;

  const message = (staleCoins as any[])
    .map(
      (coin) =>
        `${coin.symbol}\t${coin.address.padEnd(54, " ")}\t${(
          coin.latency / 3600
        ).toFixed(2)} hours ago`,
    )
    .join("\n");

  await sendMessage(message, webhookUrl, true);
};

export default wrapScheduledLambda(handler);
