import postgres from "postgres";
import { Address, LogArray } from "@defillama/sdk/build/types";
import { getCurrentUnixTimestamp } from "../utils/date";

type Insert = {
  chain: string;
  token: Address;
  holder: Address;
  timestamp?: number;
};
let auth: string[];

export function generateAuth() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
}
export default async function storeTokenOwnerLogs(logArray?: LogArray) {
  if (!logArray) return;

  const timestamp = getCurrentUnixTimestamp();
  const inserts: Insert[] = [];

  logArray.map((l: Insert) => {
    const token = l.token.toLowerCase();
    const holder = l.holder.toLowerCase();
    const duplicate = inserts.find((i: Insert) => i.chain == l.chain && i.token == l.token && i.holder && l.holder);
    if (duplicate) return;
    inserts.push({
      timestamp,
      chain: l.chain,
      token,
      holder,
    });
  });

  generateAuth();
  const sql = postgres(auth[0]);
  await sql`
    insert into bridgecontracts
    ${sql(inserts, "chain", "token", "holder", "timestamp")}
    on conflict (chain, token, holder)
    do update
    set timestamp = excluded.timestamp
  `;
  sql.end();
}
