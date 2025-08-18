import fetch from "node-fetch";
import protocols from "../protocols/data";
import { CategoryTagMap } from "../protocols/tags";

type Stats = {
  volumeUsd1d: number;
  volumeUsd7d: number;
  tvlUsd: number;
};

const testSymbols: { [id: string]: string } = {
  "5506": "USDtb",
  "4853": "BUIDL",
};

async function fetchSymbols() {
  const rwaProtocols = protocols.filter((p) => p.tags?.some((t) => CategoryTagMap.RWA.includes(t)));
  const res: { [id: string]: string } = {};
  rwaProtocols.map((p) => (res[p.id] = testSymbols[p.id]));
  return res;
}

async function fetchStats(symbols: { [id: string]: string }) {
  const { data } = await fetch(`https://pro-api.llama.fi/${process.env.INTERNAL_API_KEY}/yields/pools`).then((r) =>
    r.json()
  );
  const lps = data.filter((item: any) => item.exposure == "multi");

  const res: { [id: string]: Stats } = {};
  Object.keys(symbols).map((id: string) => {
    const symbol = symbols[id];
    if (!symbol) return;

    const rwa = lps.filter(
      (item: any) =>
        item.symbol.toLowerCase().startsWith(`${symbol.toLowerCase()}-`) ||
        item.symbol.toLowerCase().endsWith(`-${symbol.toLowerCase()}`)
    );

    res[id] = rwa.reduce(
      (acc: any, { volumeUsd1d, volumeUsd7d, tvlUsd }: any) => {
        acc.volumeUsd1d += volumeUsd1d;
        acc.volumeUsd7d += volumeUsd7d;
        acc.tvlUsd += tvlUsd;
        return acc;
      },
      {
        volumeUsd1d: 0,
        volumeUsd7d: 0,
        tvlUsd: 0,
      }
    );
  });

  return res;
}

async function main() {
  const rwaSymbols = await fetchSymbols();
  return fetchStats(rwaSymbols);
}

main(); // ts-node defi/src/rwa/index.ts
