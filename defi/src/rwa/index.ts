import fetch from "node-fetch";
import protocols from "../protocols/data";
import { CategoryTagMap } from "../protocols/tags";
import { successResponse, wrap, IResponse, errorResponse } from "../utils/shared";

type Stats = {
  volumeUsd1d: number;
  volumeUsd7d: number;
  tvlUsd: number;
};

type Characteristics = {
  symbol: string;
  matchExact: boolean;
  redeemable: boolean;
  attestations: boolean;
  cexListed: boolean;
  kyc: boolean;
  transferable: boolean;
  selfCustody: boolean;
};

const faultyIds: { [id: string]: string } = { "415": "NAOS" };

const metadata: { [id: string]: Characteristics } = {
  "753": {
    symbol: "REALTOKEN", // need to match on inclusion
    matchExact: false,
    redeemable: true,
    attestations: true,
    cexListed: false,
    kyc: true,
    transferable: false, // true but user needs pre - KYC
    selfCustody: true,
  },
  "5506": {
    symbol: "USDtb",
    matchExact: true,
    redeemable: true,
    attestations: true,
    cexListed: true, // in earn product
    kyc: true,
    transferable: true,
    selfCustody: true,
  },
  "4853": {
    symbol: "BUIDL",
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
    .filter((p) => Object.keys(metadata).includes(p.id)); // THIS IS FOR TESTING ONLY
  const res: { [id: string]: string } = {};
  rwaProtocols.map((p) => (res[p.id] = metadata[p.id].symbol));
  return res;
}

async function fetchStats(symbols: { [id: string]: string }) {
  if (!process.env.INTERNAL_API_KEY) throw new Error("INTERNAL_API_KEY is not set");
  const { data } = await fetch(`https://pro-api.llama.fi/${process.env.INTERNAL_API_KEY}/yields/pools`).then((r) =>
    r.json()
  );
  const lps = data.filter((item: any) => item.exposure == "multi");

  const res: { [id: string]: Stats } = {};
  Object.keys(symbols).map((id: string) => {
    const symbol = symbols[id];
    if (!symbol) return;

    const rwa = lps.filter((item: any) =>
      item.matchExact
        ? item.symbol.toLowerCase().startsWith(`${symbol.toLowerCase()}-`) ||
          item.symbol.toLowerCase().endsWith(`-${symbol.toLowerCase()}`)
        : item.symbol.toLowerCase().includes(symbol.toLowerCase())
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
        ...metadata[id],
      }
    );
  });

  return res;
}

const handler = async (_event: any): Promise<IResponse> => {
  try {
    const rwaSymbols = await fetchSymbols();
    const stats = await fetchStats(rwaSymbols);
    return successResponse(stats, 10 * 60); // 10 mins cache
  } catch (e: any) {
    return errorResponse({ message: e.message });
  }
};

export default wrap(handler);

// handler({});
