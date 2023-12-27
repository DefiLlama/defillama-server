import setEnvSecrets from "../utils/shared/setEnvSecrets";
import postgres from "postgres";
import { queryPostgresWithRetry } from "../../l2/layer2pg";
import { searchWidth } from "../../../coins/src/getCoins";
import { sendMessage } from "../utils/discord";

export type StaleCoins = {
  [key: string]: StaleCoinData;
};
export type StaleCoinData = {
  latency: number;
  usd_amount: number;
  symbol: string;
  protocol: string;
  key: string;
  percentage?: number;
};

let auth: string[];
let sql: any;
export const columns = ["latency", "usd_amount", "symbol", "percentage", "key", "protocol"];

async function generateAuth() {
  if (!process.env.COINS2_AUTH) await setEnvSecrets();
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
}

export function addStaleCoin(staleCoins: any, data: StaleCoinData) {
  if (!data.key) return;
  if (data.key in staleCoins && staleCoins[data.key].usdAmount > data.usd_amount) return;
  staleCoins[data.key] = data;
}

export function appendToStaleCoins(usdTvl: number, staleCoinsInclusive: StaleCoins, staleCoins: StaleCoins) {
  const threshold = usdTvl * 0.01; // 1% of protocol TVL
  Object.values(staleCoinsInclusive).map((v: StaleCoinData) => {
    if (v.usd_amount < threshold) return;
    v.percentage = (v.usd_amount * 100) / usdTvl;
    addStaleCoin(staleCoins, v);
  });
}

export function checkForStaleness(
  usd_amount: number,
  response: any,
  now: number,
  protocol: string,
  staleCoins: StaleCoins
): void {
  if (usd_amount < 1e5) return; // if <10k its minor
  const latency = (now - response.timestamp) / 3600; // hours late
  if (latency < 4) return; // if less than 4 hours stale its a non-issue
  staleCoins[response.PK] = {
    latency,
    usd_amount,
    symbol: response.symbol,
    protocol,
    key: response.PK,
  };
}

export async function storeStaleCoins(staleCoins: StaleCoins) {
  try {
    if (Object.keys(staleCoins).length == 0) return;
    await generateAuth();
    if (sql == null) sql = postgres(auth[0]);

    const stored: StaleCoinData[] = await queryPostgresWithRetry(
      sql`
      select ${sql(columns)} from stalecoins where 
      key in ${sql(Object.keys(staleCoins))}
      `,
      sql
    );

    stored.map((s: StaleCoinData) => {
      if (staleCoins[s.key].latency < s.latency) delete staleCoins[s.key];
    });

    const inserts: StaleCoinData[] = Object.values(staleCoins).map((c: StaleCoinData) => ({
      latency: Number(c.latency.toFixed(0)),
      usd_amount: Number(c.usd_amount.toPrecision(4)),
      symbol: c.symbol,
      percentage: Number(c.percentage?.toFixed(0)),
      key: c.key,
      protocol: c.protocol,
    }));

    if (inserts.length)
      await queryPostgresWithRetry(
        sql`
      insert into stalecoins
      ${sql(inserts, ...columns)}
      on conflict (key)
      do update set 
        latency = excluded.latency, 
        usd_amount = excluded.usd_amount, 
        symbol = excluded.symbol, 
        protocol = excluded.protocol,
        percentage = excluded.percentage;
      `,
        sql
      );

    return;
  } catch (e) {
    console.error(`storeStaleCoins failed with: ${e}`);
  }
}

export async function notify() {
  await generateAuth();
  const sql = postgres(auth[0]);

  const stored: StaleCoinData[] = await sql` select ${sql(columns)} from stalecoins`;

  stored.sort((a, b) => b.latency - a.latency);
  const promises: any = [];
  const timeout: number = searchWidth / 3600;
  let message: string = "";
  let teamMessage: string = "";
  stored.map((d: StaleCoinData) => {
    let readableTvl: string = d.usd_amount > 1e7 ? `${d.usd_amount / 1e7}M` : `${d.usd_amount / 1e4}k`;
    message += `\nIn ${timeout - d.latency}h a ${d.protocol} TVL chart will lose ${readableTvl}$ (${
      d.percentage
    }%) because ${d.key} is ${d.latency}h stale`;
    if (d.usd_amount > 1e8 && timeout - d.latency < 7) {
      teamMessage += `\nIn ${timeout - d.latency}h a ${d.protocol} TVL chart will lose ${readableTvl}$ (${
        d.percentage
      }%) because ${d.key} is ${d.latency}h stale`;
    }
  });

  promises.push(sql`delete from stalecoins`);
  if (message.length) promises.push(sendMessage(message, process.env.STALE_COINS_ADAPTERS_WEBHOOK!, true));
  if (!process.env.TEAM_WEBHOOK)
    promises.push(sendMessage("missing team webhook", process.env.STALE_COINS_ADAPTERS_WEBHOOK!, true));
  if (teamMessage.length) promises.push(sendMessage(teamMessage, process.env.TEAM_WEBHOOK!, true));
  await Promise.all(promises);
}
