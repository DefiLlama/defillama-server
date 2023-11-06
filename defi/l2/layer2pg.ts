import postgres from "postgres";
import { Address, LogArray } from "@defillama/sdk/build/types";
import { getCurrentUnixTimestamp } from "../src/utils/date";
import { Chain } from "@defillama/sdk/build/general";

type OwnerInsert = {
  chain: string;
  token: Address;
  holder: Address;
  amount: number;
  timestamp?: number;
};
type DeployerInsert = {
  token: Address;
  deployer: Address;
  chain: string;
};
let auth: string[];

export function generateAuth() {
  auth = process.env.COINS2_AUTH?.split(",") ?? [];
  if (!auth || auth.length != 3) throw new Error("there arent 3 auth params");
}
export async function storeTokenOwnerLogs(logArray?: LogArray): Promise<void> {
  if (!logArray) return;

  const timestamp = getCurrentUnixTimestamp();
  const inserts: OwnerInsert[] = [];

  logArray.map((l: OwnerInsert) => {
    const token = l.token.toLowerCase();
    const holder = l.holder.toLowerCase();
    const duplicate = inserts.find(
      (i: OwnerInsert) => i.chain == l.chain && i.token == l.token && i.holder == l.holder
    );
    if (duplicate) return;

    inserts.push({
      timestamp,
      chain: l.chain,
      token,
      holder,
      amount: l.amount,
    });
  });

  generateAuth();
  const sql = postgres(auth[0]);
  await sql`
    insert into bridgecontracts
    ${sql(inserts, "chain", "token", "holder", "timestamp", "amount")}
    on conflict (chain, token, holder)
    do update
    set timestamp = excluded.timestamp, amount = excluded.amount
  `;
  sql.end();
}
export async function storeDeployers(chain: string, deployers: { [token: Address]: Address }) {
  if (Object.keys(deployers).length == 0) return;

  const inserts: DeployerInsert[] = [];
  Object.keys(deployers).map((token: string) => {
    inserts.push({
      token,
      deployer: deployers[token],
      chain,
    });
  });

  generateAuth();
  const sql = postgres(auth[0]);
  await sql`
    insert into tokendeployers
    ${sql(inserts, "token", "deployer", "chain")}
    on conflict (chain, token)
    do nothing
  `;
  sql.end();
}
export async function fetchTokenOwnerLogs(chain: Chain, margin: number = 6 * 60 * 60): Promise<any> {
  const earliest = getCurrentUnixTimestamp() - margin;
  generateAuth();
  const sql = postgres(auth[0]);
  const res = await sql`
      select token, holder, amount from bridgecontracts
      where timestamp > ${earliest}
      and chain = ${chain}
    `;
  sql.end();
  return res;
}
export async function fetchTokenDeployers(chain: Chain): Promise<any> {
  generateAuth();
  const sql = postgres(auth[0]);
  const res = await sql`
      select token, deployer from tokendeployers
      where chain = ${chain}
    `;
  sql.end();
  return res;
}
