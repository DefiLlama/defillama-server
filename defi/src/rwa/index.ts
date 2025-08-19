import fetch from "node-fetch";
import protocols from "../protocols/data";
import { CategoryTagMap } from "../protocols/tags";

type Stats = {
  volumeUsd1d: number;
  volumeUsd7d: number;
  tvlUsd: number;
};

type Characteristics = {
  symbols: string[];
  matchExact: boolean;
  redeemable: boolean;
  attestations: boolean;
  cexListed: boolean;
  kyc: boolean;
  transferable: boolean;
  selfCustody: boolean;
};

const faultyIds: { [id: string]: string } = { "415": "NAOS", "1459": "ELYFI", "1667": "Solv Vesting" };

// KYC is true where required for mint / redeem.
// transferable is true where transfer doesnt require KYC.
const metadata: { [id: string]: Characteristics } = {
  "753": {
    symbols: ["REALTOKEN"], // need to match on inclusion
    matchExact: false,
    redeemable: true,
    attestations: true,
    cexListed: false,
    kyc: true,
    transferable: false, // true but user needs pre - KYC
    selfCustody: true,
  },
  "781": {
    symbols: ["KLIMA", "kVCM"],
    matchExact: true,
    redeemable: false,
    attestations: false,
    cexListed: true, // poloniex
    kyc: false,
    transferable: true,
    selfCustody: true,
  },
  "1952": {
    symbols: [], // no open market
    matchExact: true,
    redeemable: true,
    attestations: true,
    cexListed: false,
    kyc: true,
    transferable: false,
    selfCustody: true,
  },
  "1953": {
    symbols: ["CHAR"],
    matchExact: true,
    redeemable: false,
    attestations: true,
    cexListed: false,
    kyc: false,
    transferable: true,
    selfCustody: true,
  },
  "2002": {
    symbols: ["CGT", ""], // no open market
    matchExact: true,
    redeemable: true,
    attestations: true,
    cexListed: false,
    kyc: true,
    transferable: true,
    selfCustody: true,
  },
  "5506": {
    symbols: ["USDtb"],
    matchExact: true,
    redeemable: true,
    attestations: true,
    cexListed: true, // Bybit earn product
    kyc: true,
    transferable: true,
    selfCustody: true,
  },
  "4853": {
    symbols: ["BUIDL"],
    matchExact: true,
    redeemable: true,
    attestations: true,
    cexListed: false,
    kyc: true,
    transferable: true,
    selfCustody: true,
  },
};

async function fetchSymbols() {
  const rwaProtocols = protocols
    .filter((p) => p.tags?.some((t) => CategoryTagMap.RWA.includes(t)))
    .filter((p) => Object.keys(metadata).includes(p.id)); // THIS IS FOR TESTING ONLY // !Object.keys(faultyIds).includes(p.id)
  const res: { [id: string]: string[] } = {};
  rwaProtocols.map((p) => (res[p.id] = metadata[p.id].symbols));

  return res;
}

async function fetchStats(symbols: { [id: string]: string[] }) {
  if (!process.env.INTERNAL_API_KEY) throw new Error("INTERNAL_API_KEY is not set");
  const { data } = await fetch(`https://pro-api.llama.fi/${process.env.INTERNAL_API_KEY}/yields/pools`).then((r) =>
    r.json()
  );
  const lps = data.filter((item: any) => item.exposure == "multi");

  const res: { [id: string]: Stats } = {};
  Object.keys(symbols).map((id: string) => {
    let sum = {
      volumeUsd1d: 0,
      volumeUsd7d: 0,
      tvlUsd: 0,
      ...metadata[id],
    };

    symbols[id].map((symbol: string) => {
      const rwa = lps.filter((item: any) =>
        item.matchExact
          ? item.symbol.toLowerCase().startsWith(`${symbol.toLowerCase()}-`) ||
            item.symbol.toLowerCase().endsWith(`-${symbol.toLowerCase()}`)
          : item.symbol.toLowerCase().includes(symbol.toLowerCase())
      );

      sum = rwa.reduce((acc: any, { volumeUsd1d, volumeUsd7d, tvlUsd }: any) => {
        acc.volumeUsd1d += volumeUsd1d;
        acc.volumeUsd7d += volumeUsd7d;
        acc.tvlUsd += tvlUsd;
        return acc;
      }, sum);
    });

    res[id] = sum;
  });

  return res;
}

export default async function main() {
  const rwaSymbols = await fetchSymbols();
  return await fetchStats(rwaSymbols);
}

// main(); // ts-node defi/src/rwa/index.ts
