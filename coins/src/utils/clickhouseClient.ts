import { createClient, ClickHouseClient } from "@clickhouse/client";
import { Readable } from "stream";

let clients: ClickHouseClient[] | null = null;

function getClients(): ClickHouseClient[] {
  if (clients) return clients;
  const hostsStr = process.env.CH_WRITE_HOSTS || process.env.CH_HOST;
  if (!hostsStr) return [];

  const hosts = hostsStr.includes(",")
    ? hostsStr.split(",").map(h => h.trim())
    : [hostsStr.includes(":") ? hostsStr : `${hostsStr}:${process.env.CH_PORT || process.env.CH_WRITE_PORT || "8124"}`];

  clients = hosts.map(h => createClient({
    url: `http://${h}`,
    username: process.env.CH_WRITE_USER || process.env.CH_USER || "default",
    password: process.env.CH_WRITE_PASSWORD || process.env.CH_PASSWORD || "",
    request_timeout: 30000,
  }));
  return clients;
}

export async function chQuery(query: string, format: "TabSeparated" | "JSONCompact" = "TabSeparated"): Promise<string> {
  const cls = getClients();
  if (cls.length === 0) throw new Error("No CH clients configured");
  for (let i = 0; i < cls.length; i++) {
    try {
      const result = await cls[i].query({ query, format });
      return await result.text();
    } catch (e) {
      if (i < cls.length - 1) console.error(`[CH] query replica ${i} failed, trying next: ${(e as Error).message}`);
      else throw e;
    }
  }
  throw new Error("No CH clients available");
}

export async function chQueryJSON(query: string): Promise<any> {
  const cls = getClients();
  if (cls.length === 0) throw new Error("No CH clients configured");
  for (let i = 0; i < cls.length; i++) {
    try {
      const result = await cls[i].query({ query, format: "JSONCompact" });
      return await result.json();
    } catch (e) {
      if (i < cls.length - 1) console.error(`[CH] query replica ${i} failed, trying next: ${(e as Error).message}`);
      else throw e;
    }
  }
  throw new Error("No CH clients available");
}

export async function chInsert(table: string, tsvBody: string): Promise<void> {
  const cls = getClients();
  if (cls.length === 0) throw new Error("No CH clients configured");
  for (let i = 0; i < cls.length; i++) {
    try {
      await cls[i].insert({ table, values: Readable.from(tsvBody), format: "TabSeparated" });
      return;
    } catch (e) {
      if (i === cls.length - 1) throw e;
      console.error(`[CH] replica ${i} failed, trying next: ${(e as Error).message}`);
    }
  }
}

export function isChEnabled(): boolean {
  return getClients().length > 0;
}
