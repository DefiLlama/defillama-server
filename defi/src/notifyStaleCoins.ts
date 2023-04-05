import { wrapScheduledLambda } from "./utils/shared/wrap";
import { sendMessage } from "./utils/discord";
import { getCurrentUnixTimestamp } from "./utils/date";
import postgres from "postgres";

const hours = 2;

const handler = async (_event: any) => {
  const webhookUrl = process.env.STALE_COINS_ADAPTERS_WEBHOOK!;
  const now = getCurrentUnixTimestamp();
  const sql = postgres(process.env.COINS_DB!);

  const staleCoins = await sql`
    SELECT
      address,
      symbol,
      chain,
      ${now} - lastupdate as latency
    FROM public.stalecoins
    WHERE
      lastupdate < (${now - 3600 * hours}) and lastupdate > (${now - 3600 * 24})
    GROUP BY address, symbol, latency, chain
    ORDER BY latency asc;`;

  const recentlyStaleCoins = staleCoins.filter(
    (s: any) => s.latency < 3600 * (hours + 1),
  );

  const promises = [];
  if (recentlyStaleCoins.length > 100)
    promises.push(
      sendMessage(
        `At least 100 coins have just gone stale!!`,
        process.env.TEAM_WEBHOOK,
      ),
    );

  const message = (staleCoins as any[])
    .map(
      (coin) =>
        `${coin.symbol}\t${coin.chain}:${coin.address.padEnd(10, " ")}\t${(
          coin.latency / 3600
        ).toFixed(2)} hours ago`,
    )
    .join("\n");

  promises.push(sendMessage(message, webhookUrl, true));
  await Promise.all(promises);
};

export default wrapScheduledLambda(handler);
