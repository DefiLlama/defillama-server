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
type TokenInsert = {
  token: Address;
  chain: Chain;
};
export type SupplyInsert = {
  token: Address;
  chain: Chain;
  supply: number;
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
  if (!Object.keys(deployers).length) return;

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
export async function storeAllTokens(tokens: string[]) {
  if (!tokens.length) return;

  const inserts: TokenInsert[] = tokens.map((t: string) => {
    const [chain, token] = t.split(":");
    return { chain, token };
  });
  generateAuth();
  const sql = postgres(auth[0]);
  await sql`
    insert into alltokens
    ${sql(inserts, "chain", "token")}
    on conflict (chain, token)
    do nothing
  `;
  sql.end();
}
export async function updateAllTokenSupplies(supplies: SupplyInsert[]) {
  if (!supplies.length) return;
  generateAuth();
  const sql = postgres(auth[0]);
  const a = await sql`
    update alltokens
    set supply = update_data.supply
    from (values ${sql(supplies)}) as update_data(supply, chain, token)
    where update_data.token = alltokens.token
    returning alltokens.token, alltokens.supply;
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
export async function fetchAllTokens(chain: Chain): Promise<any> {
  generateAuth();
  const sql = postgres(auth[0]);
  const res = await sql`
      select token, supply from alltokens
      where chain = ${chain}
    `;
  sql.end();

  const obj: { [token: string]: number | undefined } = {};
  res.map((t: any) => {
    obj[t.token] = t.supply;
  });
  return obj;
}
export async function fetchDeployedContracts(params: {
  deployerAddresses: Address[];
  startTimestamp: number;
  endTimestamp: number;
  chain: Chain;
}): Promise<Address[]> {
  const sql = postgres(process.env.INDEXA_DB!);
  const res = await sql`
      select created_contract_address 
        from ${sql(`${params.chain}.transactions`)} 
      where
        created_contract_address != 'null' and
        block_time between ${new Date(params.startTimestamp * 1000)} and ${new Date(params.endTimestamp * 1000)} and
        from_address in ${sql(params.deployerAddresses.map((c: string) => Buffer.from(c.slice(2), "hex")))}
    `;
  sql.end();
  return res.map((r: any) => `0x${r.created_contract_address.toString("hex")}`);
}
